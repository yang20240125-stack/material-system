import { streamText, tool, convertToModelMessages, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/api-utils";
import { decrypt, isSensitiveKey } from "@/lib/crypto";

function readConfigValue(row: { configValue: string } | null, key: string, fallbackEnv?: string): string {
  if (!row?.configValue) return fallbackEnv || "";
  if (isSensitiveKey(key)) {
    try {
      return decrypt(row.configValue);
    } catch {
      return row.configValue;
    }
  }
  return row.configValue;
}

async function getAIConfig() {
  try {
    const [baseUrlRow, apiKeyRow, modelRow] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { configKey: "ai_base_url" } }),
      prisma.systemConfig.findUnique({ where: { configKey: "ai_api_key" } }),
      prisma.systemConfig.findUnique({ where: { configKey: "ai_model" } }),
    ]);
    return {
      baseURL: readConfigValue(baseUrlRow, "ai_base_url", process.env.AI_BASE_URL) || "https://api.openai.com/v1",
      apiKey: readConfigValue(apiKeyRow, "ai_api_key", process.env.AI_API_KEY),
      model: readConfigValue(modelRow, "ai_model", process.env.AI_MODEL) || "gpt-4o",
    };
  } catch {
    return {
      baseURL: process.env.AI_BASE_URL || "https://api.openai.com/v1",
      apiKey: process.env.AI_API_KEY || "",
      model: process.env.AI_MODEL || "gpt-4o",
    };
  }
}

async function saveChatLog(userId: string, role: string, content: string, metadata?: Record<string, unknown>) {
  try {
    const isOperational = metadata?.toolCalls &&
      (metadata.toolCalls as Array<{ name: string }>).some(
        (tc) => tc.name === "prepareClaim" || tc.name === "prepareReturn"
      );
    if (role === "assistant" && !isOperational) return;

    await prisma.chatLog.create({
      data: {
        userId,
        role,
        content,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (err) {
    console.error("Failed to save chat log:", err);
  }
}

function getReadTools(userId: string) {
  return {
    queryInventory: tool({
      description: "查询物资库存信息。可以按名称、分类搜索，也可以查看所有物资。",
      inputSchema: z.object({
        search: z.string().optional().describe("搜索关键词（物资名称或分类）"),
        category: z.string().optional().describe("按分类筛选"),
        inStockOnly: z.boolean().optional().describe("是否仅显示有库存的物资"),
      }),
      execute: async ({ search, category, inStockOnly }) => {
        const where: Record<string, unknown> = {};
        if (search) {
          where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
          ];
        }
        if (category) where.category = category;
        if (inStockOnly) where.stock = { gt: 0 };

        const items = await prisma.item.findMany({
          where,
          select: { id: true, name: true, category: true, stock: true, level: true },
          orderBy: { name: "asc" },
          take: 20,
        });

        return { items, total: items.length };
      },
    }),

    queryUserRecords: tool({
      description: "查询当前用户的物资领用记录",
      inputSchema: z.object({
        limit: z.number().optional().describe("返回记录数量，默认10"),
      }),
      execute: async ({ limit }) => {
        const records = await prisma.record.findMany({
          where: { userId },
          include: {
            item: { select: { name: true, category: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limit || 10,
        });

        return {
          records: records.map((r: { item: { name: string; category: string }; quantity: number; actionType: string; createdAt: Date }) => ({
            itemName: r.item.name,
            category: r.item.category,
            quantity: r.quantity,
            action: r.actionType,
            date: r.createdAt.toISOString(),
          })),
        };
      },
    }),
  };
}

function getWriteTools(userId: string) {
  return {
    prepareClaim: tool({
      description: "准备领取物资。查找物资并返回领取预览，用户确认后系统将扣减库存并记录领取台账。当用户说'给我拿一个XX'、'领取XX'等表示想领用物资时使用此工具。",
      inputSchema: z.object({
        itemId: z.string().optional().describe("物资ID（如果已知）"),
        itemName: z.string().optional().describe("物资名称（用于查找）"),
        quantity: z.number().optional().describe("领取数量，默认1"),
      }),
      execute: async ({ itemId, itemName, quantity: qty }) => {
        const quantity = qty || 1;
        let item;
        if (itemId) {
          item = await prisma.item.findUnique({ where: { id: itemId } });
        } else if (itemName) {
          item = await prisma.item.findFirst({
            where: { name: { contains: itemName, mode: "insensitive" } },
          });
        }

        if (!item) {
          return { error: "未找到匹配的物资", found: false };
        }
        if (item.stock < quantity) {
          return { error: `库存不足（当前库存 ${item.stock}，需要 ${quantity}）`, found: false };
        }

        return {
          found: true,
          action: "claim",
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          level: item.level,
          currentStock: item.stock,
          quantity,
          afterStock: item.stock - quantity,
          claimUserId: userId,
        };
      },
    }),

    prepareInventoryUpdate: tool({
      description: "准备修改物资库存（管理操作，非领取）。不会直接修改，而是返回修改前后的对比信息供用户确认。",
      inputSchema: z.object({
        itemId: z.string().optional().describe("物资ID（如果已知）"),
        itemName: z.string().optional().describe("物资名称（用于查找）"),
        newStock: z.number().optional().describe("新的库存数量"),
        stockDelta: z.number().optional().describe("库存变化量（正数增加，负数减少）"),
      }),
      execute: async ({ itemId, itemName, newStock, stockDelta }) => {
        let item;
        if (itemId) {
          item = await prisma.item.findUnique({ where: { id: itemId } });
        } else if (itemName) {
          item = await prisma.item.findFirst({
            where: { name: { contains: itemName, mode: "insensitive" } },
          });
        }

        if (!item) {
          return { error: "未找到匹配的物资", found: false };
        }

        let targetStock: number;
        if (newStock !== undefined) {
          targetStock = newStock;
        } else if (stockDelta !== undefined) {
          targetStock = item.stock + stockDelta;
        } else {
          return { error: "请指定新库存数量或变化量", found: false };
        }

        if (targetStock < 0) {
          return { error: "库存不能为负数", found: false };
        }

        return {
          found: true,
          action: "update",
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          level: item.level,
          beforeStock: item.stock,
          afterStock: targetStock,
          delta: targetStock - item.stock,
        };
      },
    }),

    prepareInventoryCreate: tool({
      description: "准备新增物资。返回预览信息供用户确认。",
      inputSchema: z.object({
        name: z.string().describe("物资名称"),
        category: z.string().describe("物资分类"),
        stock: z.number().describe("初始库存数量"),
        level: z.enum(["NORMAL", "SPECIAL"]).optional().describe("物资级别"),
      }),
      execute: async ({ name, category, stock, level }) => {
        return {
          found: true,
          action: "create",
          itemName: name,
          category,
          afterStock: stock,
          level: level || "NORMAL",
        };
      },
    }),

    prepareInventoryDelete: tool({
      description: "准备删除物资。返回物资信息供用户确认。",
      inputSchema: z.object({
        itemId: z.string().optional().describe("物资ID"),
        itemName: z.string().optional().describe("物资名称"),
      }),
      execute: async ({ itemId, itemName }) => {
        let item;
        if (itemId) {
          item = await prisma.item.findUnique({ where: { id: itemId } });
        } else if (itemName) {
          item = await prisma.item.findFirst({
            where: { name: { contains: itemName, mode: "insensitive" } },
          });
        }

        if (!item) {
          return { error: "未找到匹配的物资", found: false };
        }

        return {
          found: true,
          action: "delete",
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          currentStock: item.stock,
          level: item.level,
        };
      },
    }),
  };
}

export async function POST(request: Request) {
  const user = await getRequestUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await request.json();
  const config = await getAIConfig();

  if (!config.apiKey) {
    return new Response(
      JSON.stringify({ error: "AI 未配置 API Key，请管理员在设置页填写。" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const openai = createOpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  });

  const isAdmin = user.role === "ADMIN";

  const readTools = getReadTools(user.userId);
  const tools = isAdmin
    ? { ...readTools, ...getWriteTools(user.userId) }
    : { ...readTools, ...getClaimTool(user.userId) };

  const systemPrompt = `你是一个企业物资管理助手。当前用户: ${user.name}，角色: ${isAdmin ? "管理员" : "普通用户"}。

你的职责是帮助用户查询物资库存、领用记录等信息。

重要规则：
${isAdmin ? `- 你是管理员，可以查询和修改物资信息。
- 当用户说"给我拿XX"、"领取XX"等想领取物资时，使用 prepareClaim 工具。
- 当用户要求修改库存数量（不是领取）、新增物资或删除物资时，使用 prepareInventoryUpdate / prepareInventoryCreate / prepareInventoryDelete 工具。
- 绝对不要直接修改数据库，所有写操作必须通过确认流程。` : `- 你是普通用户，可以查询物资和个人领用记录。
- 如果用户想领取**普通物资**，可以使用 prepareClaim 工具（特殊/贵重物资需要联系管理员分配）。
- 你不能修改、新增或删除任何物资信息。如果用户要求管理操作，请礼貌地告知需要联系管理员。`}
- 回答要简洁、专业、使用中文。
- 查询结果请用清晰的格式展示。
- 极其重要：当你调用 prepare* 系列工具后，系统会在前端展示确认卡片让用户点击确认。你只需告诉用户"请在上方卡片中确认操作"，绝对不要自行宣布操作已完成或模拟操作结果。实际的数据库操作由前端确认卡片触发，不是由你执行的。`;

  const modelMessages = await convertToModelMessages(messages, { tools });

  const result = streamText({
    model: openai(config.model),
    system: systemPrompt,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(5),
    onFinish: async (event) => {
      const text = event.text || "";
      const toolCalls = event.steps
        ?.flatMap((s) => s.toolCalls || [])
        .map((tc) => ({ name: tc.toolName, args: "args" in tc ? tc.args : undefined }));

      await saveChatLog(user.userId, "assistant", text, {
        toolCalls: toolCalls?.length ? toolCalls : undefined,
        model: config.model,
      });
    },
    onError: (event) => {
      console.error("AI stream error:", event.error);
    },
  });

  return result.toUIMessageStreamResponse();
}

function getClaimTool(userId: string) {
  return {
    prepareClaim: tool({
      description: "准备领取普通物资。查找物资并返回领取预览，用户确认后系统将扣减库存并记录到台账。当用户说'给我拿一个XX'、'领取XX'等表示想领用物资时使用此工具。注意：特殊/贵重物资需要管理员分配，不能自行领取。",
      inputSchema: z.object({
        itemName: z.string().describe("物资名称"),
        quantity: z.number().optional().describe("领取数量，默认1"),
      }),
      execute: async ({ itemName, quantity: qty }) => {
        const quantity = qty || 1;
        const item = await prisma.item.findFirst({
          where: { name: { contains: itemName, mode: "insensitive" } },
        });

        if (!item) {
          return { error: "未找到匹配的物资", found: false };
        }
        if (item.level === "SPECIAL") {
          return { error: "这是特殊/贵重物资，需要联系管理员分配，不能自行领取。", found: false };
        }
        if (item.stock < quantity) {
          return { error: `库存不足（当前库存 ${item.stock}，需要 ${quantity}）`, found: false };
        }

        return {
          found: true,
          action: "claim",
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          level: item.level,
          currentStock: item.stock,
          quantity,
          afterStock: item.stock - quantity,
          claimUserId: userId,
        };
      },
    }),
  };
}

import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireAdmin } from "@/lib/api-utils";
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

export async function GET() {
  const user = await getRequestUser();
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const [baseUrlRow, apiKeyRow, modelRow] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { configKey: "ai_base_url" } }),
      prisma.systemConfig.findUnique({ where: { configKey: "ai_api_key" } }),
      prisma.systemConfig.findUnique({ where: { configKey: "ai_model" } }),
    ]);

    const baseURL = readConfigValue(baseUrlRow, "ai_base_url", process.env.AI_BASE_URL) || "https://api.openai.com/v1";
    const apiKey = readConfigValue(apiKeyRow, "ai_api_key", process.env.AI_API_KEY);
    const model = readConfigValue(modelRow, "ai_model", process.env.AI_MODEL) || "gpt-4o";

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "API Key 未配置",
        config: { baseURL, model, apiKeySet: false },
      });
    }

    const openai = createOpenAI({ baseURL, apiKey });

    const result = await generateText({
      model: openai(model),
      prompt: "回复两个字：正常",
    });

    return NextResponse.json({
      success: true,
      response: result.text,
      config: {
        baseURL,
        model,
        apiKeySet: true,
        apiKeyPrefix: apiKey.slice(0, 7) + "...",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      success: false,
      error: message,
      config: { apiKeySet: true },
    });
  }
}

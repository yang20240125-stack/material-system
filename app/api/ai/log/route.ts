import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/api-utils";

const TRACKED_ACTIONS = ["claim", "return"];

export async function POST(request: NextRequest) {
  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, data, success } = body;

    if (!TRACKED_ACTIONS.includes(action)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const itemName = data?.itemName || "未知";
    const quantity = data?.quantity || 1;

    await prisma.chatLog.create({
      data: {
        userId: user.userId,
        role: "confirm",
        content: `${user.name}通过AI助手${success ? "确认" : "取消"}${action === "claim" ? "领取" : "归还"}了物资「${itemName}」×${quantity}`,
        metadata: JSON.stringify({
          action,
          success,
          itemId: data?.itemId,
          itemName,
          quantity,
          category: data?.category,
          operatorName: user.name,
        }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to save AI log:", err);
    return NextResponse.json({ error: "保存失败", detail: String(err) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const user = await getRequestUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "仅管理员可查看" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = 20;

  try {
    const [logs, total] = await Promise.all([
      prisma.chatLog.findMany({
        where: { role: "confirm" },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.chatLog.count({ where: { role: "confirm" } }),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("Failed to fetch AI logs:", err);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}

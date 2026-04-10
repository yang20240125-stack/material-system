import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/api-utils";
import { notifyClaimSuccess } from "@/lib/dingtalk-notify";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { quantity = 1 } = await request.json();

  if (!Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ error: "数量必须为正整数" }, { status: 400 });
  }

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "物资不存在" }, { status: 404 });
  }

  if (item.level === "SPECIAL" && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "特殊物资仅限管理员分配" },
      { status: 403 }
    );
  }

  if (item.stock < quantity) {
    return NextResponse.json({ error: "库存不足" }, { status: 400 });
  }

  const updatedItem = await prisma.item.update({
    where: { id },
    data: { stock: { decrement: quantity } },
  });

  await prisma.record.create({
    data: {
      userId: user.userId,
      itemId: id,
      quantity,
      actionType: "CLAIM",
    },
  });

  // Async notification - don't block the response
  notifyClaimSuccess(user.userId, item.name, quantity).catch(() => {});

  return NextResponse.json({ item: updatedItem });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireAdmin } from "@/lib/api-utils";
import { notifyAssignment } from "@/lib/dingtalk-notify";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getRequestUser();
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: "仅管理员可分配" }, { status: 403 });
  }

  const { quantity = 1, targetUserId } = await request.json();

  if (!Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ error: "数量必须为正整数" }, { status: 400 });
  }

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "物资不存在" }, { status: 404 });
  }

  if (item.stock < quantity) {
    return NextResponse.json({ error: "库存不足" }, { status: 400 });
  }

  const recipientId = targetUserId || user!.userId;

  const updatedItem = await prisma.item.update({
    where: { id },
    data: { stock: { decrement: quantity } },
  });

  await prisma.record.create({
    data: {
      userId: recipientId,
      itemId: id,
      quantity,
      actionType: "CLAIM",
      adminId: user!.userId,
    },
  });

  notifyAssignment(recipientId, item.name, quantity, user!.name).catch(() => {});

  return NextResponse.json({ item: updatedItem });
}

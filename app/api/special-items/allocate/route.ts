import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireAdmin } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  const user = await getRequestUser();
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: "仅管理员可分配特殊物资" }, { status: 403 });
  }

  const { itemId, targetUserId, quantity = 1, department = "" } = await request.json();

  if (!itemId || !targetUserId) {
    return NextResponse.json({ error: "缺少物资ID或目标用户" }, { status: 400 });
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ error: "数量必须为正整数" }, { status: 400 });
  }

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) {
    return NextResponse.json({ error: "物资不存在" }, { status: 404 });
  }

  if (item.level !== "SPECIAL") {
    return NextResponse.json({ error: "仅支持特殊物资" }, { status: 400 });
  }

  if (item.stock < quantity) {
    return NextResponse.json({ error: "库存不足" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    return NextResponse.json({ error: "目标用户不存在" }, { status: 404 });
  }

  const [updatedItem, allocation] = await prisma.$transaction([
    prisma.item.update({
      where: { id: itemId },
      data: { stock: { decrement: quantity } },
    }),
    prisma.specialItemAllocation.create({
      data: {
        itemId,
        userId: targetUserId,
        quantity,
        department,
      },
    }),
    prisma.record.create({
      data: {
        userId: targetUserId,
        itemId,
        quantity,
        actionType: "CLAIM",
        adminId: user!.userId,
      },
    }),
  ]);

  return NextResponse.json({ item: updatedItem, allocation });
}

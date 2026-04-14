import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireAdmin } from "@/lib/api-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getRequestUser();
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: "仅管理员可操作" }, { status: 403 });
  }

  const { targetUserId, department = "" } = await request.json();

  if (!targetUserId) {
    return NextResponse.json({ error: "请选择新的领用人" }, { status: 400 });
  }

  const allocation = await prisma.specialItemAllocation.findUnique({
    where: { id },
    include: { item: true },
  });

  if (!allocation) {
    return NextResponse.json({ error: "分配记录不存在" }, { status: 404 });
  }

  if (allocation.returnedAt) {
    return NextResponse.json({ error: "该物资已归还，无法变更" }, { status: 400 });
  }

  if (allocation.userId === targetUserId) {
    return NextResponse.json({ error: "新领用人不能与当前领用人相同" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    return NextResponse.json({ error: "目标用户不存在" }, { status: 404 });
  }

  const [, newAllocation] = await prisma.$transaction([
    prisma.specialItemAllocation.update({
      where: { id },
      data: { returnedAt: new Date() },
    }),
    prisma.specialItemAllocation.create({
      data: {
        itemId: allocation.itemId,
        userId: targetUserId,
        quantity: allocation.quantity,
        department: department || allocation.department,
      },
    }),
    prisma.record.create({
      data: {
        userId: targetUserId,
        itemId: allocation.itemId,
        quantity: allocation.quantity,
        actionType: "TRANSFER",
        adminId: user!.userId,
      },
    }),
  ]);

  return NextResponse.json({ allocation: newAllocation });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireAdmin } from "@/lib/api-utils";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getRequestUser();
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: "仅管理员可操作" }, { status: 403 });
  }

  const allocation = await prisma.specialItemAllocation.findUnique({
    where: { id },
    include: { item: true },
  });

  if (!allocation) {
    return NextResponse.json({ error: "分配记录不存在" }, { status: 404 });
  }

  if (allocation.returnedAt) {
    return NextResponse.json({ error: "该物资已归还" }, { status: 400 });
  }

  const [updatedItem] = await prisma.$transaction([
    prisma.item.update({
      where: { id: allocation.itemId },
      data: { stock: { increment: allocation.quantity } },
    }),
    prisma.specialItemAllocation.update({
      where: { id },
      data: { returnedAt: new Date() },
    }),
    prisma.record.create({
      data: {
        userId: allocation.userId,
        itemId: allocation.itemId,
        quantity: allocation.quantity,
        actionType: "RETURN",
        adminId: user!.userId,
      },
    }),
  ]);

  return NextResponse.json({ item: updatedItem });
}

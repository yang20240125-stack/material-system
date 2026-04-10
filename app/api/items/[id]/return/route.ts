import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/api-utils";

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

  const updatedItem = await prisma.item.update({
    where: { id },
    data: { stock: { increment: quantity } },
  });

  await prisma.record.create({
    data: {
      userId: user.userId,
      itemId: id,
      quantity,
      actionType: "RETURN",
    },
  });

  return NextResponse.json({ item: updatedItem });
}

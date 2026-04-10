import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireAdmin } from "@/lib/api-utils";
import { itemFormSchemaCoerced } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getRequestUser();
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data = itemFormSchemaCoerced.parse(body);

    const item = await prisma.item.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category,
        stock: data.stock,
        level: data.level,
        imageUrl: data.imageUrl || null,
      },
    });

    const stockDelta = data.stock - existing.stock;
    await prisma.record.create({
      data: {
        userId: user!.userId,
        itemId: id,
        quantity: stockDelta,
        actionType: "EDIT",
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getRequestUser();
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  await prisma.record.create({
    data: {
      userId: user!.userId,
      itemId: id,
      quantity: existing.stock,
      actionType: "DELETE",
    },
  });

  await prisma.item.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

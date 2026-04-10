import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireAdmin } from "@/lib/api-utils";
import { itemFormSchemaCoerced } from "@/lib/validators";
export async function GET(request: NextRequest) {
  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "12")));
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const inStock = searchParams.get("inStock");
  const level = searchParams.get("level") || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.category = category;
  }

  if (inStock === "true") {
    where.stock = { gt: 0 };
  }

  if (level === "NORMAL" || level === "SPECIAL") {
    where.level = level;
  }

  const [items, total, categories] = await Promise.all([
    prisma.item.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.item.count({ where }),
    prisma.item.findMany({
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    categories: categories.map((c: { category: string }) => c.category),
  });
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser();
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = itemFormSchemaCoerced.parse(body);

    const item = await prisma.item.create({
      data: {
        name: data.name,
        category: data.category,
        stock: data.stock,
        level: data.level,
        imageUrl: data.imageUrl || null,
      },
    });

    await prisma.record.create({
      data: {
        userId: user!.userId,
        itemId: item.id,
        quantity: data.stock,
        actionType: "ADD",
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error }, { status: 400 });
    }
    throw error;
  }
}

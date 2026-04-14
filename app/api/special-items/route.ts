import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireAdmin } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const user = await getRequestUser();
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));
  const tab = searchParams.get("tab") || "claimed";
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";

  if (tab === "claimed") {
    const where: Record<string, unknown> = { returnedAt: null };

    if (search) {
      where.OR = [
        { item: { name: { contains: search, mode: "insensitive" } } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { department: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.item = { ...(where.item as object || {}), category };
    }

    const [allocations, total] = await Promise.all([
      prisma.specialItemAllocation.findMany({
        where,
        include: {
          item: { select: { id: true, name: true, category: true, imageUrl: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { claimedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.specialItemAllocation.count({ where }),
    ]);

    return NextResponse.json({
      allocations,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  }

  // tab === "unclaimed": show special items with stock > 0
  const itemWhere: Record<string, unknown> = { level: "SPECIAL" };

  if (search) {
    itemWhere.name = { contains: search, mode: "insensitive" };
  }

  if (category) {
    itemWhere.category = category;
  }

  const [items, total, categories] = await Promise.all([
    prisma.item.findMany({
      where: itemWhere,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.item.count({ where: itemWhere }),
    prisma.item.findMany({
      where: { level: "SPECIAL" },
      select: { category: true },
      distinct: ["category"],
    }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    categories: categories.map((c) => c.category),
  });
}

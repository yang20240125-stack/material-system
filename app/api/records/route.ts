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
  const actionType = searchParams.get("actionType") || "";
  const search = searchParams.get("search") || "";

  const where: Record<string, unknown> = {};

  if (actionType && ["CLAIM", "RETURN", "ADD", "EDIT", "DELETE", "TRANSFER"].includes(actionType)) {
    where.actionType = actionType;
  }

  if (search) {
    where.OR = [
      { item: { name: { contains: search, mode: "insensitive" } } },
      { user: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [records, total] = await Promise.all([
    prisma.record.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        item: { select: { id: true, name: true, category: true } },
        admin: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.record.count({ where }),
  ]);

  return NextResponse.json({
    records,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

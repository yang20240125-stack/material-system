import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "仅管理员可导出" }, { status: 403 });
  }

  const allocations = await prisma.specialItemAllocation.findMany({
    where: { returnedAt: null },
    include: {
      item: { select: { name: true, category: true } },
      user: { select: { name: true } },
    },
    orderBy: { claimedAt: "desc" },
  });

  const rows = allocations.map((a) => ({
    物资名称: a.item.name,
    分类: a.item.category,
    领用人: a.user.name,
    领用部门: a.department || "",
    领用数量: a.quantity,
    领用时间: a.claimedAt.toISOString().replace("T", " ").slice(0, 19),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 12 },
    { wch: 18 },
    { wch: 10 },
    { wch: 22 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "特殊物资领用");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const filename = `特殊物资领用_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

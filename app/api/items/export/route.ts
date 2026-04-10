import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "仅管理员可导出物资" }, { status: 403 });
  }

  const items = await prisma.item.findMany({
    orderBy: { createdAt: "desc" },
  });

  const rows = items.map((item: { id: string; name: string; category: string; stock: number; level: string; imageUrl: string | null; createdAt: Date; updatedAt: Date }) => ({
    物资名称: item.name,
    分类: item.category,
    库存数量: item.stock,
    物资级别: item.level === "NORMAL" ? "普通" : "特殊/贵重",
    图片URL: item.imageUrl || "",
    创建时间: item.createdAt.toISOString(),
    更新时间: item.updatedAt.toISOString(),
    ID: item.id,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  const colWidths = [
    { wch: 25 }, // 物资名称
    { wch: 15 }, // 分类
    { wch: 10 }, // 库存数量
    { wch: 12 }, // 物资级别
    { wch: 40 }, // 图片URL
    { wch: 22 }, // 创建时间
    { wch: 22 }, // 更新时间
    { wch: 38 }, // ID
  ];
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "物资列表");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const filename = `物资导出_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

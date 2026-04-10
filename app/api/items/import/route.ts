import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

const LEVEL_MAP: Record<string, "NORMAL" | "SPECIAL"> = {
  普通: "NORMAL",
  "特殊/贵重": "SPECIAL",
  NORMAL: "NORMAL",
  SPECIAL: "SPECIAL",
};

interface RowData {
  物资名称?: string;
  分类?: string;
  库存数量?: number | string;
  物资级别?: string;
  图片URL?: string;
  ID?: string;
}

export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  const userId = request.headers.get("x-user-id");
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "仅管理员可导入物资" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "未找到上传文件" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: "Excel 文件中没有工作表" }, { status: 400 });
    }

    const rows = XLSX.utils.sheet_to_json<RowData>(workbook.Sheets[sheetName]);
    if (rows.length === 0) {
      return NextResponse.json({ error: "表格中没有数据行" }, { status: 400 });
    }

    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // header is row 1

      const name = String(row["物资名称"] ?? "").trim();
      const category = String(row["分类"] ?? "").trim();
      const stockRaw = row["库存数量"];
      const levelStr = String(row["物资级别"] ?? "").trim();
      const imageUrl = String(row["图片URL"] ?? "").trim();
      const existingId = String(row["ID"] ?? "").trim();

      if (!name) {
        errors.push(`第 ${rowNum} 行：物资名称不能为空`);
        continue;
      }
      if (!category) {
        errors.push(`第 ${rowNum} 行：分类不能为空`);
        continue;
      }

      const stock = Number(stockRaw);
      if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
        errors.push(`第 ${rowNum} 行：库存数量必须为非负整数，当前值 "${stockRaw}"`);
        continue;
      }

      const level = LEVEL_MAP[levelStr];
      if (!level) {
        errors.push(`第 ${rowNum} 行：物资级别无效 "${levelStr}"，应为 普通/特殊贵重/NORMAL/SPECIAL`);
        continue;
      }

      const data = {
        name,
        category,
        stock,
        level,
        imageUrl: imageUrl || null,
      };

      if (existingId) {
        const existing = await prisma.item.findUnique({ where: { id: existingId } });
        if (existing) {
          await prisma.item.update({ where: { id: existingId }, data });
          await prisma.record.create({
            data: {
              userId: userId!,
              itemId: existingId,
              quantity: stock - existing.stock,
              actionType: "EDIT",
              adminId: userId,
            },
          });
          updated++;
        } else {
          const newItem = await prisma.item.create({ data });
          await prisma.record.create({
            data: {
              userId: userId!,
              itemId: newItem.id,
              quantity: stock,
              actionType: "ADD",
              adminId: userId,
            },
          });
          created++;
        }
      } else {
        const newItem = await prisma.item.create({ data });
        await prisma.record.create({
          data: {
            userId: userId!,
            itemId: newItem.id,
            quantity: stock,
            actionType: "ADD",
            adminId: userId,
          },
        });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      total: rows.length,
      created,
      updated,
      failed: errors.length,
      errors: errors.slice(0, 50),
    });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json({ error: "导入失败，请检查文件格式" }, { status: 500 });
  }
}

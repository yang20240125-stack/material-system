import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireAdmin } from "@/lib/api-utils";
import { encrypt, decrypt, maskValue, isSensitiveKey } from "@/lib/crypto";

const CONFIG_KEYS = [
  "ai_base_url",
  "ai_api_key",
  "ai_model",
  "dingtalk_app_key",
  "dingtalk_app_secret",
];

export async function GET() {
  const user = await getRequestUser();
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const configs = await prisma.systemConfig.findMany({
    where: { configKey: { in: CONFIG_KEYS } },
  });

  const result: Record<string, string> = {};

  for (const key of CONFIG_KEYS) {
    const row = configs.find((c: { configKey: string }) => c.configKey === key);
    if (!row) {
      result[key] = "";
      continue;
    }

    if (isSensitiveKey(key)) {
      try {
        const decrypted = decrypt(row.configValue);
        result[key] = maskValue(decrypted);
      } catch {
        result[key] = maskValue(row.configValue);
      }
    } else {
      result[key] = row.configValue;
    }
  }

  return NextResponse.json({ config: result });
}

export async function PUT(request: NextRequest) {
  const user = await getRequestUser();
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json();
  const updates: { key: string; value: string }[] = [];

  for (const key of CONFIG_KEYS) {
    if (body[key] !== undefined && body[key] !== "") {
      const masked = body[key] as string;
      if (masked.includes("****")) continue;

      const value = isSensitiveKey(key) ? encrypt(masked) : masked;
      updates.push({ key, value });
    }
  }

  for (const { key, value } of updates) {
    await prisma.systemConfig.upsert({
      where: { configKey: key },
      update: { configValue: value },
      create: { configKey: key, configValue: value },
    });
  }

  return NextResponse.json({ success: true, updated: updates.length });
}

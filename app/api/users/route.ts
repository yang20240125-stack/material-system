import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser, requireAdmin } from "@/lib/api-utils";

export async function GET() {
  const user = await getRequestUser();
  if (!requireAdmin(user)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true, dingtalk_userid: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ users });
}

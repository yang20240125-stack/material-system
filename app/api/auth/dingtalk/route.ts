import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdByAuthCode } from "@/lib/dingtalk";
import { signToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { authCode } = await request.json();

    if (!authCode) {
      return NextResponse.json({ error: "authCode is required" }, { status: 400 });
    }

    // In development, support mock login with special codes
    let userInfo: { userid: string; name: string; avatar: string };

    if (process.env.NODE_ENV === "development" && authCode.startsWith("dev_")) {
      const mockUserId = authCode.replace("dev_", "");
      const existingUser = await prisma.user.findUnique({
        where: { dingtalk_userid: mockUserId },
      });

      if (!existingUser) {
        return NextResponse.json({ error: "Mock user not found" }, { status: 404 });
      }

      userInfo = {
        userid: existingUser.dingtalk_userid,
        name: existingUser.name,
        avatar: existingUser.avatar || "",
      };
    } else {
      userInfo = await getUserIdByAuthCode(authCode);
    }

    const user = await prisma.user.upsert({
      where: { dingtalk_userid: userInfo.userid },
      update: {
        name: userInfo.name,
        avatar: userInfo.avatar || null,
      },
      create: {
        dingtalk_userid: userInfo.userid,
        name: userInfo.name,
        avatar: userInfo.avatar || null,
        role: "USER",
      },
    });

    const token = await signToken({
      userId: user.id,
      role: user.role,
      name: user.name,
    });

    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("DingTalk auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}

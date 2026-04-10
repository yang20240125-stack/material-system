"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Dev mode: mock login with dingtalk_userid
  const [devUserId, setDevUserId] = useState("");

  async function handleDingTalkLogin() {
    setLoading(true);
    setError("");

    try {
      // In DingTalk H5 environment, use JSAPI to get authCode
      if (typeof window !== "undefined" && "dd" in window) {
        const dd = await import("dingtalk-jsapi");
        const result = await dd.runtime.permission.requestAuthCode({
          corpId: process.env.NEXT_PUBLIC_DINGTALK_CORP_ID || "",
        });

        const res = await fetch("/api/auth/dingtalk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authCode: result.code }),
        });

        if (!res.ok) throw new Error("Login failed");
        router.push("/materials");
        return;
      }

      setError("当前不在钉钉环境中，请使用开发模式登录");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDevLogin() {
    if (!devUserId.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/dingtalk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authCode: `dev_${devUserId}` }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }

      router.push("/materials");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white">
            <Package className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            企业物资管理系统
          </CardTitle>
          <CardDescription>请使用钉钉账号登录</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleDingTalkLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? "登录中..." : "钉钉免密登录"}
          </Button>

          {process.env.NODE_ENV === "development" && (
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm text-slate-500 text-center">
                开发模式：使用 dingtalk_userid 登录
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="如: admin_001 或 user_001"
                  value={devUserId}
                  onChange={(e) => setDevUserId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleDevLogin()}
                />
                <Button
                  variant="outline"
                  onClick={handleDevLogin}
                  disabled={loading}
                >
                  登录
                </Button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

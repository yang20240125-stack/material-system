"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Bot, MessageSquare, Zap, CheckCircle2, XCircle } from "lucide-react";

const DEFAULT_CONFIG: Record<string, string> = {
  ai_base_url: "",
  ai_api_key: "",
  ai_model: "",
  dingtalk_app_key: "",
  dingtalk_app_secret: "",
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery<{ config: Record<string, string> }>({
    queryKey: ["config"],
    queryFn: async () => {
      const res = await fetch("/api/config");
      if (!res.ok) throw new Error("Failed to fetch config");
      return res.json();
    },
  });

  const serverConfig = data?.config ?? DEFAULT_CONFIG;
  const form = { ...serverConfig, ...overrides };

  const handleChange = useCallback((key: string, value: string) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  }, []);

  const mutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("保存失败");
      return res.json();
    },
    onSuccess: (result) => {
      toast.success(`配置已保存（更新了 ${result.updated} 项）`);
      queryClient.invalidateQueries({ queryKey: ["config"] });
      setOverrides({});
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleSave() {
    mutation.mutate(form);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">系统设置</h2>
        <p className="text-sm text-slate-500 mt-1">管理 AI 模型和钉钉集成配置</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-blue-600" />
            AI 模型配置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai_base_url">Base URL</Label>
            <Input
              id="ai_base_url"
              value={form.ai_base_url}
              onChange={(e) => handleChange("ai_base_url", e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai_api_key">API Key</Label>
            <Input
              id="ai_api_key"
              type="password"
              value={form.ai_api_key}
              onChange={(e) => handleChange("ai_api_key", e.target.value)}
              placeholder="sk-..."
            />
            <p className="text-xs text-slate-400">敏感信息加密存储，留空表示不修改</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai_model">模型名称</Label>
            <Input
              id="ai_model"
              value={form.ai_model}
              onChange={(e) => handleChange("ai_model", e.target.value)}
              placeholder="gpt-4o"
            />
          </div>
          <TestConnectionButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            钉钉应用配置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dingtalk_app_key">AppKey</Label>
            <Input
              id="dingtalk_app_key"
              value={form.dingtalk_app_key}
              onChange={(e) => handleChange("dingtalk_app_key", e.target.value)}
              placeholder="dingxxxxx"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dingtalk_app_secret">AppSecret</Label>
            <Input
              id="dingtalk_app_secret"
              type="password"
              value={form.dingtalk_app_secret}
              onChange={(e) => handleChange("dingtalk_app_secret", e.target.value)}
              placeholder="留空表示不修改"
            />
            <p className="text-xs text-slate-400">敏感信息加密存储，留空表示不修改</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          保存配置
        </Button>
      </div>
    </div>
  );
}

function TestConnectionButton() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string; response?: string; config?: Record<string, unknown> } | null>(null);

  async function handleTest() {
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/test");
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: "请求失败，请检查网络" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">连接测试</span>
        <Button size="sm" variant="outline" onClick={handleTest} disabled={testing}>
          {testing ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Zap className="mr-1.5 h-3 w-3" />}
          {testing ? "测试中..." : "测试连接"}
        </Button>
      </div>
      {result && (
        <div className={`rounded-md p-2.5 text-sm ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          <div className="flex items-center gap-1.5 font-medium">
            {result.success ? (
              <><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-green-700">连接成功</span></>
            ) : (
              <><XCircle className="h-4 w-4 text-red-600" /><span className="text-red-700">连接失败</span></>
            )}
          </div>
          {result.success && result.response && (
            <p className="mt-1 text-green-600 text-xs">AI 回复: {result.response}</p>
          )}
          {!result.success && result.error && (
            <p className="mt-1 text-red-600 text-xs break-all">{result.error}</p>
          )}
          {result.config && (
            <p className="mt-1 text-slate-500 text-xs">
              Base URL: {String(result.config.baseURL || "-")} | 模型: {String(result.config.model || "-")} | Key: {result.config.apiKeySet ? (String(result.config.apiKeyPrefix || "已设置")) : "未设置"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

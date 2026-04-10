"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, ChevronLeft, ChevronRight, PackageMinus, PackagePlus, CheckCircle2, XCircle } from "lucide-react";

interface ChatLogEntry {
  id: string;
  userId: string;
  user: { id: string; name: string; avatar: string | null };
  role: string;
  content: string;
  metadata: string | null;
  createdAt: string;
}

interface LogsResponse {
  logs: ChatLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function AILogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<LogsResponse>({
    queryKey: ["ai-logs", page],
    queryFn: async () => {
      const res = await fetch(`/api/ai/log?page=${page}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  function parseMetadata(raw: string | null): Record<string, unknown> {
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Bot className="h-6 w-6 text-blue-600" />
          AI 操作记录
        </h2>
        <p className="text-sm text-slate-500 mt-1">查看通过 AI 助手进行的物资领取和归还记录</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : !data?.logs?.length ? (
          <div className="text-center py-16 text-slate-400">
            <Bot className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-lg font-medium">暂无 AI 操作记录</p>
            <p className="text-sm mt-1">用户通过 AI 助手领取或归还物资时将在此记录</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.logs.map((log) => {
              const meta = parseMetadata(log.metadata);
              const isSuccess = meta.success === true;
              const action = meta.action as string;
              const isClaim = action === "claim";

              return (
                <div key={log.id} className="px-5 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 rounded-full p-1.5 ${isClaim ? "bg-blue-100" : "bg-green-100"}`}>
                      {isClaim ? (
                        <PackageMinus className="h-4 w-4 text-blue-600" />
                      ) : (
                        <PackagePlus className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-slate-900">
                          {log.user.name}
                        </span>
                        <Badge variant={isClaim ? "default" : "secondary"} className="text-xs">
                          {isClaim ? "领取" : "归还"}
                        </Badge>
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-0.5 text-xs text-green-600">
                            <CheckCircle2 className="h-3 w-3" /> 已确认
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-xs text-slate-400">
                            <XCircle className="h-3 w-3" /> 已取消
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5">
                        {log.content}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span>{format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")}</span>
                        {meta.quantity != null && <span>数量: {Number(meta.quantity)}</span>}
                        {meta.category != null && <span>分类: {String(meta.category as string)}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            共 {data.total} 条记录
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-600">
              {data.page} / {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

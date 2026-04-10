"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Check, X, Loader2, ArrowRight, PackageMinus } from "lucide-react";
import { useAppStore } from "@/lib/store";

const DONE_KEY = "ai-confirm-done";

function getCompletedSet(): Record<string, "confirmed" | "cancelled"> {
  try {
    const raw = localStorage.getItem(DONE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function markCompleted(toolCallId: string, state: "confirmed" | "cancelled") {
  const set = getCompletedSet();
  set[toolCallId] = state;
  try { localStorage.setItem(DONE_KEY, JSON.stringify(set)); } catch {}
}

export function clearCompletedConfirms() {
  localStorage.removeItem(DONE_KEY);
}

interface ConfirmCardProps {
  toolCallId: string;
  data: Record<string, unknown>;
  onConfirmed?: () => void;
}

async function logConfirmAction(action: string, data: Record<string, unknown>, success: boolean) {
  try {
    const res = await fetch("/api/ai/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, data, success }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error("AI log failed:", res.status, errBody);
    }
  } catch (err) {
    console.error("AI log fetch error:", err);
  }
}

export function ConfirmCard({ toolCallId, data, onConfirmed }: ConfirmCardProps) {
  const user = useAppStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";
  const queryClient = useQueryClient();

  const savedState = getCompletedSet()[toolCallId];
  const [confirmed, setConfirmed] = useState(savedState === "confirmed");
  const [cancelled, setCancelled] = useState(savedState === "cancelled");

  const action = data.action as string;

  const mutation = useMutation({
    mutationFn: async () => {
      if (action === "claim") {
        const res = await fetch(`/api/items/${data.itemId}/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: data.quantity || 1 }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "领取失败");
        }
        return res.json();
      }

      if (action === "update") {
        const res = await fetch(`/api/items/${data.itemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.itemName,
            category: data.category,
            stock: data.afterStock,
            level: data.level || "NORMAL",
          }),
        });
        if (!res.ok) throw new Error("更新失败");
        return res.json();
      }

      if (action === "create") {
        const res = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.itemName,
            category: data.category,
            stock: data.afterStock,
            level: data.level || "NORMAL",
          }),
        });
        if (!res.ok) throw new Error("创建失败");
        return res.json();
      }

      if (action === "delete") {
        const res = await fetch(`/api/items/${data.itemId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("删除失败");
        return res.json();
      }

      throw new Error("Unknown action");
    },
    onSuccess: async () => {
      setConfirmed(true);
      markCompleted(toolCallId, "confirmed");
      const actionLabel = action === "claim" ? "领取成功" : "操作执行成功";
      toast.success(actionLabel);
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["records"] });
      await logConfirmAction(action, data, true);
      onConfirmed?.();
    },
    onError: async (err: Error) => {
      toast.error(err.message);
      await logConfirmAction(action, data, false);
    },
  });

  const canOperate = action === "claim" || isAdmin;
  if (!canOperate) return null;

  if (confirmed) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-3 flex items-center gap-2 text-green-700 text-sm">
          <Check className="h-4 w-4" />
          {action === "claim" ? "物资已领取" : "操作已执行"}
        </CardContent>
      </Card>
    );
  }

  if (cancelled) {
    return (
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="p-3 flex items-center gap-2 text-slate-500 text-sm">
          <X className="h-4 w-4" />
          操作已取消
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={action === "claim" ? "border-blue-200 bg-blue-50" : "border-amber-200 bg-amber-50"}>
      <CardHeader className="p-3 pb-2">
        <CardTitle className={`flex items-center gap-2 text-sm font-medium ${action === "claim" ? "text-blue-800" : "text-amber-800"}`}>
          {action === "claim" ? <PackageMinus className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {action === "claim" ? "物资领取确认" : "数据库变更确认"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        <div className="text-sm text-slate-700 space-y-1">
          <p>
            <span className="text-slate-500">物资：</span>
            <strong>{data.itemName as string}</strong>
          </p>
          {data.category ? (
            <p>
              <span className="text-slate-500">分类：</span>
              {String(data.category)}
            </p>
          ) : null}

          {action === "claim" && (
            <div className="flex items-center gap-2 mt-2 p-2 rounded bg-white">
              <span className="text-slate-500">领取数量：</span>
              <span className="text-blue-600 font-semibold">{data.quantity as number}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">库存：</span>
              <span className="text-slate-600">{data.currentStock as number}</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
              <span className="text-green-600 font-semibold">{data.afterStock as number}</span>
            </div>
          )}

          {action === "update" && (
            <div className="flex items-center gap-2 mt-2 p-2 rounded bg-white">
              <span className="text-red-500 line-through font-mono">
                {data.beforeStock as number}
              </span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
              <span className="text-green-600 font-semibold font-mono">
                {data.afterStock as number}
              </span>
              <span className="text-slate-400 text-xs ml-1">
                ({(data.delta as number) > 0 ? "+" : ""}
                {data.delta as number})
              </span>
            </div>
          )}

          {action === "create" && (
            <p>
              <span className="text-slate-500">初始库存：</span>
              <span className="text-green-600 font-semibold">{data.afterStock as number}</span>
            </p>
          )}

          {action === "delete" && (
            <p className="text-red-600 text-xs mt-1">
              此操作将永久删除该物资（当前库存：{data.currentStock as number}）
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={async () => {
              setCancelled(true);
              markCompleted(toolCallId, "cancelled");
              await logConfirmAction(action, data, false);
            }}
            disabled={mutation.isPending}
          >
            取消
          </Button>
          <Button
            size="sm"
            className={`flex-1 text-xs ${action === "claim" ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-600 hover:bg-amber-700"}`}
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Check className="h-3 w-3 mr-1" />
            )}
            {action === "claim" ? "确认领取" : "确认执行"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

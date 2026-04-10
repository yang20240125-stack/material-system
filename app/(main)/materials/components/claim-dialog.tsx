"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface ClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    name: string;
    stock: number;
    level: "NORMAL" | "SPECIAL";
  } | null;
}

export function ClaimDialog({ open, onOpenChange, item }: ClaimDialogProps) {
  const user = useAppStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!item) return;
      const url =
        item.level === "SPECIAL" && isAdmin
          ? `/api/items/${item.id}/assign`
          : `/api/items/${item.id}/claim`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "操作失败");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(`成功领取 ${item?.name} x${quantity}`);
      queryClient.invalidateQueries({ queryKey: ["items"] });
      onOpenChange(false);
      setQuantity(1);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {item?.level === "SPECIAL" ? "分配特殊物资" : "领取物资"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            物资：<strong>{item?.name}</strong>（当前库存：{item?.stock}）
          </p>
          <div className="space-y-2">
            <Label htmlFor="quantity">领取数量</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={item?.stock || 1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || quantity < 1}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认领取
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

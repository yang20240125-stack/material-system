"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface AllocateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    name: string;
    stock: number;
  } | null;
}

export function AllocateDialog({ open, onOpenChange, item }: AllocateDialogProps) {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [targetUserId, setTargetUserId] = useState("");
  const [department, setDepartment] = useState("");

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setTargetUserId("");
      setDepartment("");
    }
  }, [open]);

  const { data: usersData } = useQuery<{ users: { id: string; name: string }[] }>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!item) return;
      const res = await fetch("/api/special-items/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, targetUserId, quantity, department }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "分配失败");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(`成功分配 ${item?.name} x${quantity}`);
      queryClient.invalidateQueries({ queryKey: ["special-items"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>分配特殊物资</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            物资：<strong>{item?.name}</strong>（当前库存：{item?.stock}）
          </p>

          <div className="space-y-2">
            <Label>领用人</Label>
            <Select
              value={targetUserId}
              onValueChange={(v: string | null) => setTargetUserId(v || "")}
              items={usersData?.users?.map((u) => ({ value: u.id, label: u.name })) ?? []}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择领用人" />
              </SelectTrigger>
              <SelectContent>
                {usersData?.users?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>领用部门</Label>
            <Input
              placeholder="输入领用部门"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>领用数量</Label>
            <Input
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
              disabled={mutation.isPending || !targetUserId || quantity < 1}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认分配
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

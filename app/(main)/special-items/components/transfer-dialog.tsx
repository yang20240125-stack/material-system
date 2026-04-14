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

interface Allocation {
  id: string;
  quantity: number;
  department: string;
  item: { id: string; name: string; category: string };
  user: { id: string; name: string };
}

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocation: Allocation | null;
}

export function TransferDialog({ open, onOpenChange, allocation }: TransferDialogProps) {
  const queryClient = useQueryClient();
  const [targetUserId, setTargetUserId] = useState("");
  const [department, setDepartment] = useState("");

  useEffect(() => {
    if (open && allocation) {
      setTargetUserId("");
      setDepartment(allocation.department);
    }
  }, [open, allocation]);

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
      if (!allocation) return;
      const res = await fetch(`/api/special-items/${allocation.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, department }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "变更失败");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("领用人变更成功");
      queryClient.invalidateQueries({ queryKey: ["special-items"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const availableUsers = usersData?.users?.filter((u) => u.id !== allocation?.user.id) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>变更领用人</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">物资名称</span>
              <span className="font-medium">{allocation?.item.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">当前领用人</span>
              <span className="font-medium">{allocation?.user.name}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>新领用人</Label>
            <Select
              value={targetUserId}
              onValueChange={(v: string | null) => setTargetUserId(v || "")}
              items={availableUsers.map((u) => ({ value: u.id, label: u.name }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择新的领用人" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((u) => (
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

          <p className="text-sm text-slate-500">
            变更后，原领用记录将自动结束，新领用记录将被创建，操作记录到流转台账。
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !targetUserId}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认变更
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

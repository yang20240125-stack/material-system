"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Allocation {
  id: string;
  quantity: number;
  department: string;
  item: { id: string; name: string; category: string };
  user: { id: string; name: string };
}

interface ReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocation: Allocation | null;
}

export function ReturnDialog({ open, onOpenChange, allocation }: ReturnDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!allocation) return;
      const res = await fetch(`/api/special-items/${allocation.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "归还失败");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(`${allocation?.item.name} 已归还`);
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
          <DialogTitle>归还特殊物资</DialogTitle>
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
            <div className="flex justify-between">
              <span className="text-slate-500">领用部门</span>
              <span className="font-medium">{allocation?.department || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">数量</span>
              <span className="font-medium">{allocation?.quantity}</span>
            </div>
          </div>
          <p className="text-sm text-amber-600">
            确认归还后，物资将回到库存，此操作将记录到流转台账。
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认归还
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

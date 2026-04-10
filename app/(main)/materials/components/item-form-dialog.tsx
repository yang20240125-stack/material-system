"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { itemFormSchema, type ItemFormValues } from "@/lib/validators";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: {
    id: string;
    name: string;
    category: string;
    stock: number;
    level: "NORMAL" | "SPECIAL";
    imageUrl: string | null;
  } | null;
}

export function ItemFormDialog({ open, onOpenChange, editItem }: ItemFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!editItem;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: "",
      category: "",
      stock: 0,
      level: "NORMAL",
      imageUrl: "",
    },
  });

  useEffect(() => {
    if (editItem) {
      form.reset({
        name: editItem.name,
        category: editItem.category,
        stock: editItem.stock,
        level: editItem.level,
        imageUrl: editItem.imageUrl || "",
      });
    } else {
      form.reset({
        name: "",
        category: "",
        stock: 0,
        level: "NORMAL",
        imageUrl: "",
      });
    }
  }, [editItem, form]);

  const mutation = useMutation({
    mutationFn: async (data: ItemFormValues) => {
      const url = isEdit ? `/api/items/${editItem!.id}` : "/api/items";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "操作失败");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(isEdit ? "物资已更新" : "物资已添加");
      queryClient.invalidateQueries({ queryKey: ["items"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("图片不能超过 5MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("上传失败");
      const data = await res.json();
      form.setValue("imageUrl", data.url, { shouldValidate: true });
      toast.success("图片已上传");
    } catch {
      toast.error("图片上传失败，请手动输入 URL");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onSubmit(data: ItemFormValues) {
    mutation.mutate(data);
  }

  const currentImageUrl = form.watch("imageUrl");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑物资" : "新增物资"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">物资名称</Label>
            <Input id="name" {...form.register("name")} placeholder="如：MacBook Pro 16" />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">分类</Label>
            <Input id="category" {...form.register("category")} placeholder="如：电子设备" />
            {form.formState.errors.category && (
              <p className="text-sm text-red-500">{form.formState.errors.category.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock">库存数量</Label>
              <Input
                id="stock"
                type="number"
                min={0}
                {...form.register("stock", { valueAsNumber: true })}
              />
              {form.formState.errors.stock && (
                <p className="text-sm text-red-500">{form.formState.errors.stock.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>物资级别</Label>
              <Select
                value={form.watch("level")}
                onValueChange={(v: string | null) => v && form.setValue("level", v as "NORMAL" | "SPECIAL")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">普通</SelectItem>
                  <SelectItem value="SPECIAL">特殊/贵重</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>物资图片（可选）</Label>
            <div className="flex gap-2">
              <Input
                {...form.register("imageUrl")}
                placeholder="输入图片 URL 或点击上传"
                className="flex-1"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </Button>
            </div>
            {form.formState.errors.imageUrl && (
              <p className="text-sm text-red-500">{form.formState.errors.imageUrl.message}</p>
            )}
            {currentImageUrl && (
              <div className="mt-2 rounded-md border border-slate-200 p-2">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <ImageIcon className="h-3 w-3" />
                  预览
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentImageUrl}
                  alt="预览"
                  className="max-h-32 rounded object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "保存修改" : "创建物资"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

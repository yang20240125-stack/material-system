"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

interface ImportResult {
  success: boolean;
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/items/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "导入失败");
      return data as ImportResult;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["items"] });
      if (data.failed === 0) {
        toast.success(`导入完成：新增 ${data.created}，更新 ${data.updated}`);
      } else {
        toast.warning(`导入部分完成：成功 ${data.created + data.updated}，失败 ${data.failed}`);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  }

  function handleImport() {
    if (selectedFile) {
      mutation.mutate(selectedFile);
    }
  }

  function handleClose(v: boolean) {
    if (!v) {
      setSelectedFile(null);
      setResult(null);
      mutation.reset();
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            导入物资
          </DialogTitle>
          <DialogDescription>
            上传 Excel 文件（.xlsx）批量导入物资。文件格式需包含列：物资名称、分类、库存数量、物资级别。
            可先导出现有数据作为模板。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!result ? (
            <>
              <div
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-8 hover:border-slate-300 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-slate-400 mb-3" />
                {selectedFile ? (
                  <div className="text-center">
                    <p className="font-medium text-slate-700">{selectedFile.name}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB · 点击重新选择
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="font-medium text-slate-600">点击选择 Excel 文件</p>
                    <p className="text-sm text-slate-400 mt-1">支持 .xlsx、.xls 格式</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="rounded-md bg-blue-50 border border-blue-100 p-3 text-sm text-blue-700">
                <p className="font-medium mb-1">Excel 格式说明：</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-600">
                  <li><b>物资名称</b>（必填）</li>
                  <li><b>分类</b>（必填）</li>
                  <li><b>库存数量</b>（必填，非负整数）</li>
                  <li><b>物资级别</b>（必填：普通 / 特殊/贵重）</li>
                  <li><b>图片URL</b>（可选）</li>
                  <li><b>ID</b>（可选，填写已有 ID 则更新该物资）</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleClose(false)}>
                  取消
                </Button>
                <Button onClick={handleImport} disabled={!selectedFile || mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  开始导入
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {result.failed === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  )}
                  <span className="font-medium">
                    {result.failed === 0 ? "全部导入成功" : "部分导入成功"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-md bg-green-50 p-2">
                    <p className="text-2xl font-bold text-green-600">{result.created}</p>
                    <p className="text-xs text-green-700">新增</p>
                  </div>
                  <div className="rounded-md bg-blue-50 p-2">
                    <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
                    <p className="text-xs text-blue-700">更新</p>
                  </div>
                  <div className="rounded-md bg-red-50 p-2">
                    <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                    <p className="text-xs text-red-700">失败</p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-md bg-red-50 border border-red-100 p-3">
                    <p className="font-medium text-red-700 text-sm mb-1">错误详情：</p>
                    <ul className="text-sm text-red-600 space-y-0.5">
                      {result.errors.map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleClose(false)}>完成</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

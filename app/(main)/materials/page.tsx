"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RotateCcw, Plus, Download, Upload, LayoutGrid, Table2 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { ItemCard } from "./components/item-card";
import { ItemTable } from "./components/item-table";
import { Pagination } from "./components/pagination";
import { ItemFormDialog } from "./components/item-form-dialog";
import { DeleteConfirmDialog } from "./components/delete-confirm-dialog";
import { ClaimDialog } from "./components/claim-dialog";
import { ImportDialog } from "./components/import-dialog";

interface Item {
  id: string;
  name: string;
  imageUrl: string | null;
  stock: number;
  category: string;
  level: "NORMAL" | "SPECIAL";
  createdAt: string;
  updatedAt: string;
}

interface ItemsResponse {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categories: string[];
}

export default function MaterialsPage() {
  const user = useAppStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("");
  const [inStock, setInStock] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const [claimItem, setClaimItem] = useState<Item | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  const { data, isLoading } = useQuery<ItemsResponse>({
    queryKey: ["items", page, search, category, inStock],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "12");
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (inStock) params.set("inStock", inStock);

      const res = await fetch(`/api/items?${params}`);
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function handleReset() {
    setSearchInput("");
    setSearch("");
    setCategory("");
    setInStock("");
    setPage(1);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/items/export");
      if (!res.ok) throw new Error("导出失败");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `物资导出_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("导出成功");
    } catch {
      toast.error("导出失败");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">物资大厅</h2>
          <p className="text-sm text-slate-500 mt-1">浏览和搜索公司物资</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? "导出中..." : "导出"}
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              导入
            </Button>
            <Button onClick={() => { setEditItem(null); setFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              新增物资
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="搜索物资名称或分类..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>

        <Select value={category || "all"} onValueChange={(v: string | null) => { setCategory(!v || v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {data?.categories?.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={inStock || "all"} onValueChange={(v: string | null) => { setInStock(!v || v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="库存状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="true">仅看有库存</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={handleReset} size="sm">
          <RotateCcw className="mr-1 h-3 w-3" />
          重置
        </Button>

        <div className="ml-auto flex items-center rounded-md border border-slate-200 p-0.5">
          <button
            className={`rounded px-2 py-1.5 transition-colors ${viewMode === "card" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            onClick={() => setViewMode("card")}
            title="卡片视图"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            className={`rounded px-2 py-1.5 transition-colors ${viewMode === "table" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            onClick={() => setViewMode("table")}
            title="表格视图"
          >
            <Table2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Items */}
      {isLoading ? (
        viewMode === "card" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-72 rounded-lg border border-slate-200 bg-white animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-slate-100 animate-pulse" />
            ))}
          </div>
        )
      ) : data?.items?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Search className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">没有找到物资</p>
          <p className="text-sm">尝试调整筛选条件</p>
        </div>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data?.items?.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={(it) => { setEditItem(it as Item); setFormOpen(true); }}
              onDelete={(it) => setDeleteItem(it as Item)}
              onClaim={(it) => setClaimItem(it as Item)}
            />
          ))}
        </div>
      ) : (
        <ItemTable
          items={data?.items ?? []}
          onEdit={(it) => { setEditItem(it as Item); setFormOpen(true); }}
          onDelete={(it) => setDeleteItem(it as Item)}
          onClaim={(it) => setClaimItem(it as Item)}
        />
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={setPage}
        />
      )}

      {/* Dialogs */}
      <ItemFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editItem={editItem}
      />
      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        item={deleteItem}
      />
      <ClaimDialog
        open={!!claimItem}
        onOpenChange={(open) => !open && setClaimItem(null)}
        item={claimItem}
      />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </div>
  );
}

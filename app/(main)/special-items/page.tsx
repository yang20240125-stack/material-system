"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, RotateCcw, Package, RotateCw, UserRoundPen, Download } from "lucide-react";
import { toast } from "sonner";
import { Pagination } from "../materials/components/pagination";
import { AllocateDialog } from "./components/allocate-dialog";
import { ReturnDialog } from "./components/return-dialog";
import { TransferDialog } from "./components/transfer-dialog";

interface Allocation {
  id: string;
  quantity: number;
  department: string;
  claimedAt: string;
  item: { id: string; name: string; category: string; imageUrl: string | null };
  user: { id: string; name: string };
}

interface SpecialItem {
  id: string;
  name: string;
  imageUrl: string | null;
  stock: number;
  category: string;
  createdAt: string;
}

type Tab = "claimed" | "unclaimed";

export default function SpecialItemsPage() {
  const [tab, setTab] = useState<Tab>("claimed");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [allocateItem, setAllocateItem] = useState<SpecialItem | null>(null);
  const [returnAlloc, setReturnAlloc] = useState<Allocation | null>(null);
  const [transferAlloc, setTransferAlloc] = useState<Allocation | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["special-items", tab, page, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("tab", tab);
      params.set("page", String(page));
      params.set("pageSize", "20");
      if (search) params.set("search", search);
      const res = await fetch(`/api/special-items?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
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
    setPage(1);
  }

  function handleTabChange(newTab: Tab) {
    setTab(newTab);
    setPage(1);
    setSearch("");
    setSearchInput("");
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/special-items/export");
      if (!res.ok) throw new Error("导出失败");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `特殊物资领用_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
          <h2 className="text-2xl font-bold text-slate-900">特殊物资管理</h2>
          <p className="text-sm text-slate-500 mt-1">管理特殊物资的领用、归还与变更</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "导出中..." : "导出领用记录"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-200">
        <button
          className={`pb-3 text-sm font-medium transition-colors relative ${
            tab === "claimed"
              ? "text-blue-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => handleTabChange("claimed")}
        >
          已领用
          {tab === "claimed" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>
        <button
          className={`pb-3 text-sm font-medium transition-colors relative ${
            tab === "unclaimed"
              ? "text-blue-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => handleTabChange("unclaimed")}
        >
          未领用
          {tab === "unclaimed" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={tab === "claimed" ? "搜索物资名、领用人或部门..." : "搜索物资名称..."}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="mr-1 h-3 w-3" />
          重置
        </Button>
      </div>

      {/* Table content */}
      {tab === "claimed" ? (
        <ClaimedTable
          allocations={data?.allocations || []}
          isLoading={isLoading}
          onReturn={setReturnAlloc}
          onTransfer={setTransferAlloc}
        />
      ) : (
        <UnclaimedTable
          items={data?.items || []}
          isLoading={isLoading}
          onAllocate={setAllocateItem}
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
      <AllocateDialog
        open={!!allocateItem}
        onOpenChange={(open) => !open && setAllocateItem(null)}
        item={allocateItem}
      />
      <ReturnDialog
        open={!!returnAlloc}
        onOpenChange={(open) => !open && setReturnAlloc(null)}
        allocation={returnAlloc}
      />
      <TransferDialog
        open={!!transferAlloc}
        onOpenChange={(open) => !open && setTransferAlloc(null)}
        allocation={transferAlloc}
      />
    </div>
  );
}

function ClaimedTable({
  allocations,
  isLoading,
  onReturn,
  onTransfer,
}: {
  allocations: Allocation[];
  isLoading: boolean;
  onReturn: (a: Allocation) => void;
  onTransfer: (a: Allocation) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>物资名称</TableHead>
            <TableHead>分类</TableHead>
            <TableHead>领用人</TableHead>
            <TableHead>领用部门</TableHead>
            <TableHead>领用时间</TableHead>
            <TableHead className="text-right">数量</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j}>
                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : allocations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                暂无已领用的特殊物资
              </TableCell>
            </TableRow>
          ) : (
            allocations.map((alloc) => (
              <TableRow key={alloc.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                      {alloc.item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={alloc.item.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-4 w-4 text-slate-300" />
                      )}
                    </div>
                    <span className="font-medium text-slate-900">{alloc.item.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-slate-500">{alloc.item.category}</TableCell>
                <TableCell className="font-medium">{alloc.user.name}</TableCell>
                <TableCell className="text-slate-500">{alloc.department || "-"}</TableCell>
                <TableCell className="text-sm text-slate-600 tabular-nums">
                  {format(new Date(alloc.claimedAt), "yyyy-MM-dd HH:mm")}
                </TableCell>
                <TableCell className="text-right font-mono">{alloc.quantity}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => onTransfer(alloc)}
                    >
                      <UserRoundPen className="mr-1 h-3 w-3" />
                      变更
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                      onClick={() => onReturn(alloc)}
                    >
                      <RotateCw className="mr-1 h-3 w-3" />
                      归还
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function UnclaimedTable({
  items,
  isLoading,
  onAllocate,
}: {
  items: SpecialItem[];
  isLoading: boolean;
  onAllocate: (item: SpecialItem) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>物资名称</TableHead>
            <TableHead>分类</TableHead>
            <TableHead className="text-right">库存</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <TableCell key={j}>
                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10 text-slate-400">
                暂无未领用的特殊物资
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => {
              const stockColor =
                item.stock === 0
                  ? "text-red-600 bg-red-50"
                  : item.stock <= 5
                    ? "text-orange-600 bg-orange-50"
                    : "text-green-600 bg-green-50";

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-slate-300" />
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-slate-900">{item.name}</span>
                        <Badge variant="destructive" className="ml-2 text-xs">特殊</Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500">{item.category}</TableCell>
                  <TableCell className="text-right">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${stockColor}`}>
                      {item.stock}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 tabular-nums">
                    {format(new Date(item.createdAt), "yyyy-MM-dd HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={item.stock === 0}
                        onClick={() => onAllocate(item)}
                      >
                        分配
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

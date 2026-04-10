"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useState, useMemo } from "react";
import { format } from "date-fns";

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

interface ItemTableProps {
  items: Item[];
  onEdit?: (item: Item) => void;
  onDelete?: (item: Item) => void;
  onClaim?: (item: Item) => void;
}

type SortKey = "name" | "category" | "stock" | "level" | "createdAt";
type SortDir = "asc" | "desc";

export function ItemTable({ items, onEdit, onDelete, onClaim }: ItemTableProps) {
  const user = useAppStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return items;
    return [...items].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv), "zh-CN");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, sortKey, sortDir]);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  }

  function ThButton({ col, children }: { col: SortKey; children: React.ReactNode }) {
    return (
      <button
        className="flex items-center font-medium hover:text-slate-900 transition-colors"
        onClick={() => toggleSort(col)}
      >
        {children}
        <SortIcon col={col} />
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="px-4 py-3 text-left text-slate-500 font-medium w-12">#</th>
              <th className="px-4 py-3 text-left text-slate-500 w-10"></th>
              <th className="px-4 py-3 text-left text-slate-500">
                <ThButton col="name">物资名称</ThButton>
              </th>
              <th className="px-4 py-3 text-left text-slate-500">
                <ThButton col="category">分类</ThButton>
              </th>
              <th className="px-4 py-3 text-left text-slate-500">
                <ThButton col="stock">库存</ThButton>
              </th>
              <th className="px-4 py-3 text-left text-slate-500">
                <ThButton col="level">级别</ThButton>
              </th>
              <th className="px-4 py-3 text-left text-slate-500">
                <ThButton col="createdAt">创建时间</ThButton>
              </th>
              <th className="px-4 py-3 text-right text-slate-500 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, idx) => {
              const stockColor =
                item.stock === 0
                  ? "text-red-600 bg-red-50"
                  : item.stock <= 5
                    ? "text-orange-600 bg-orange-50"
                    : "text-green-600 bg-green-50";

              const canClaim = item.stock > 0 && (item.level === "NORMAL" || isAdmin);

              return (
                <tr
                  key={item.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-400 tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-4 w-4 text-slate-300" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.category}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${stockColor}`}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.level === "SPECIAL" ? (
                      <Badge variant="destructive" className="text-xs">特殊</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">普通</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 tabular-nums text-xs">
                    {format(new Date(item.createdAt), "yyyy-MM-dd HH:mm")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => onEdit?.(item)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                            onClick={() => onDelete?.(item)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {item.level === "SPECIAL" && !isAdmin ? (
                        <Button variant="outline" size="sm" className="h-7 text-xs" disabled>
                          需管理员
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          disabled={!canClaim}
                          onClick={() => onClaim?.(item)}
                        >
                          {isAdmin && item.level === "SPECIAL" ? "分配" : "领取"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

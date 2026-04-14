"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, RotateCcw } from "lucide-react";
import { Pagination } from "../materials/components/pagination";

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  CLAIM: { label: "领取", variant: "default" },
  RETURN: { label: "归还", variant: "secondary" },
  ADD: { label: "入库", variant: "outline" },
  EDIT: { label: "编辑", variant: "outline" },
  DELETE: { label: "删除", variant: "destructive" },
  TRANSFER: { label: "转移", variant: "default" },
};

interface RecordItem {
  id: string;
  quantity: number;
  actionType: string;
  createdAt: string;
  user: { id: string; name: string };
  item: { id: string; name: string; category: string };
  admin: { id: string; name: string } | null;
}

interface RecordsResponse {
  records: RecordItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function RecordsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [actionType, setActionType] = useState("");

  const { data, isLoading } = useQuery<RecordsResponse>({
    queryKey: ["records", page, search, actionType],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "20");
      if (search) params.set("search", search);
      if (actionType) params.set("actionType", actionType);
      const res = await fetch(`/api/records?${params}`);
      if (!res.ok) throw new Error("Failed to fetch records");
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">流转台账</h2>
        <p className="text-sm text-slate-500 mt-1">查看所有物资流转记录</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="搜索物资名或操作者..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput);
                setPage(1);
              }
            }}
            className="pl-9"
          />
        </div>

        <Select value={actionType || "all"} onValueChange={(v: string | null) => { setActionType(!v || v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="操作类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="CLAIM">领取</SelectItem>
            <SelectItem value="RETURN">归还</SelectItem>
            <SelectItem value="ADD">入库</SelectItem>
            <SelectItem value="EDIT">编辑</SelectItem>
            <SelectItem value="DELETE">删除</SelectItem>
            <SelectItem value="TRANSFER">转移</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => { setSearchInput(""); setSearch(""); setActionType(""); setPage(1); }}
        >
          <RotateCcw className="mr-1 h-3 w-3" />
          重置
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>操作者</TableHead>
              <TableHead>物资</TableHead>
              <TableHead>分类</TableHead>
              <TableHead>类型</TableHead>
              <TableHead className="text-right">数量</TableHead>
              <TableHead>管理员</TableHead>
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
            ) : data?.records?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                  暂无记录
                </TableCell>
              </TableRow>
            ) : (
              data?.records?.map((record) => {
                const action = ACTION_LABELS[record.actionType] || { label: record.actionType, variant: "outline" as const };
                return (
                  <TableRow key={record.id}>
                    <TableCell className="text-sm text-slate-600">
                      {format(new Date(record.createdAt), "yyyy-MM-dd HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium">{record.user.name}</TableCell>
                    <TableCell>{record.item.name}</TableCell>
                    <TableCell className="text-slate-500">{record.item.category}</TableCell>
                    <TableCell>
                      <Badge variant={action.variant}>{action.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{record.quantity}</TableCell>
                    <TableCell className="text-slate-500">
                      {record.admin?.name || "-"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

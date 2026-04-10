"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Pencil, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface Item {
  id: string;
  name: string;
  imageUrl: string | null;
  stock: number;
  category: string;
  level: "NORMAL" | "SPECIAL";
}

interface ItemCardProps {
  item: Item;
  onEdit?: (item: Item) => void;
  onDelete?: (item: Item) => void;
  onClaim?: (item: Item) => void;
}

export function ItemCard({ item, onEdit, onDelete, onClaim }: ItemCardProps) {
  const user = useAppStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";

  const stockColor =
    item.stock === 0
      ? "text-red-600"
      : item.stock <= 5
        ? "text-orange-500"
        : "text-green-600";

  const stockLabel =
    item.stock === 0
      ? "已耗尽"
      : item.stock <= 5
        ? "库存不足"
        : "库存充足";

  const canClaim =
    item.stock > 0 &&
    (item.level === "NORMAL" || isAdmin);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md flex flex-col">
      <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center relative">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <Package className="h-12 w-12 text-slate-300" />
        )}
        {isAdmin && (
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 w-7 p-0"
              onClick={(e) => { e.stopPropagation(); onEdit?.(item); }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
              onClick={(e) => { e.stopPropagation(); onDelete?.(item); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900 leading-tight line-clamp-1">
            {item.name}
          </h3>
          {item.level === "SPECIAL" && (
            <Badge variant="destructive" className="text-xs shrink-0">
              特殊物资
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{item.category}</span>
          <div className="flex items-center gap-1">
            <span className={`font-medium ${stockColor}`}>
              {item.stock}
            </span>
            <span className="text-slate-400 text-xs">({stockLabel})</span>
          </div>
        </div>

        <div className="mt-auto pt-2">
          {item.level === "SPECIAL" && !isAdmin ? (
            <Button variant="outline" size="sm" className="w-full" disabled>
              仅限管理员分配
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full"
              disabled={!canClaim}
              onClick={() => onClaim?.(item)}
            >
              {isAdmin && item.level === "SPECIAL" ? "分配领取" : "快捷领取"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

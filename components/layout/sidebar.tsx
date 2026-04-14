"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { Package, ClipboardList, Settings, Lock, Bot, ShieldCheck } from "lucide-react";

const navItems = [
  {
    label: "物资大厅",
    href: "/materials",
    icon: Package,
    adminOnly: false,
  },
  {
    label: "特殊物资",
    href: "/special-items",
    icon: ShieldCheck,
    adminOnly: true,
  },
  {
    label: "流转台账",
    href: "/records",
    icon: ClipboardList,
    adminOnly: true,
  },
  {
    label: "AI 操作记录",
    href: "/ai-logs",
    icon: Bot,
    adminOnly: true,
  },
  {
    label: "系统设置",
    href: "/settings",
    icon: Settings,
    adminOnly: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAppStore((s) => s.user);

  return (
    <aside className="hidden w-56 flex-shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
          <Package className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold text-slate-900">物资管理系统</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          if (item.adminOnly && user?.role !== "ADMIN") return null;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {item.adminOnly && (
                <Lock className="ml-auto h-3 w-3 text-slate-400" />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

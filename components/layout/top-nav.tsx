"use client";

import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function TopNav() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    useAppStore.getState().setUser(null);
    router.replace("/login");
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button className="md:hidden p-2 rounded-md hover:bg-slate-100">
          <Menu className="h-5 w-5 text-slate-600" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900 hidden md:block">
          物资管理系统
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-100 cursor-pointer outline-none">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                  {user.name.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-slate-700 hidden sm:inline">
                {user.name}
              </span>
              <Badge
                variant={user.role === "ADMIN" ? "default" : "secondary"}
                className="text-xs"
              >
                {user.role === "ADMIN" ? "管理员" : "用户"}
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

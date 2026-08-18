"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ListTodo,
  Grid2x2,
  KanbanSquare,
  Settings,
  Search,
  Plus,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/tasks", label: "Tarefas", icon: ListTodo },
  { href: "/matrix", label: "Matriz", icon: Grid2x2 },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/settings", label: "Cadastros", icon: Settings },
];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/tasks?q=${encodeURIComponent(q)}` : "/tasks");
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-14 items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Zap className="size-4" />
            </span>
            <span className="tracking-tight">TaskFlow</span>
          </Link>

          <form onSubmit={submitSearch} className="relative ml-auto hidden sm:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar (TF-000123, cliente, tag…)"
              className="w-56 pl-8 md:w-72"
              aria-label="Buscar tarefas"
            />
          </form>

          <Button asChild size="sm" className="ml-auto sm:ml-0">
            <Link href="/tasks/new">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Nova tarefa</span>
            </Link>
          </Button>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto pb-2">
          {NAV.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

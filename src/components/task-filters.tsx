"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_META, STATUS_ORDER, IMPORTANCE_META, IMPORTANCE_ORDER } from "@/lib/labels";

type Option = { id: string; name: string };
const ALL = "all";

const QUICK = [
  { key: "mine", label: "Minhas" },
  { key: "today", label: "Hoje" },
  { key: "overdue", label: "Atrasadas" },
  { key: "running", label: "Em execução" },
  { key: "completed", label: "Concluídas" },
] as const;

export function TaskFilters({
  options,
}: {
  options: { users: Option[]; departments: Option[]; clients: Option[]; tags: Option[] };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = (key: string) => searchParams.get(key) ?? undefined;

  const setParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value || value === ALL) params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams],
  );

  const hasFilters = [...searchParams.keys()].length > 0;
  const activeQuick = get("quick");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q.key}
            type="button"
            onClick={() =>
              setParams({ quick: activeQuick === q.key ? undefined : q.key })
            }
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              activeQuick === q.key
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-accent",
            )}
          >
            {q.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterSelect
          value={get("status") ?? ALL}
          onChange={(v) => setParams({ status: v })}
          placeholder="Status"
          items={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_META[s].label }))}
        />
        <FilterSelect
          value={get("importance") ?? ALL}
          onChange={(v) => setParams({ importance: v })}
          placeholder="Importância"
          items={IMPORTANCE_ORDER.map((i) => ({ value: i, label: IMPORTANCE_META[i].label }))}
        />
        <FilterSelect
          value={get("responsibleId") ?? ALL}
          onChange={(v) => setParams({ responsibleId: v })}
          placeholder="Responsável"
          items={options.users.map((u) => ({ value: u.id, label: u.name }))}
        />
        <FilterSelect
          value={get("departmentId") ?? ALL}
          onChange={(v) => setParams({ departmentId: v })}
          placeholder="Departamento"
          items={options.departments.map((d) => ({ value: d.id, label: d.name }))}
        />
        <FilterSelect
          value={get("clientId") ?? ALL}
          onChange={(v) => setParams({ clientId: v })}
          placeholder="Cliente"
          items={options.clients.map((c) => ({ value: c.id, label: c.name }))}
        />
        <FilterSelect
          value={get("tagId") ?? ALL}
          onChange={(v) => setParams({ tagId: v })}
          placeholder="Tag"
          items={options.tags.map((t) => ({ value: t.id, label: `#${t.name}` }))}
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
            <X className="size-4" /> Limpar
          </Button>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  items,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  items: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-auto min-w-32">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}: todos</SelectItem>
        {items.map((it) => (
          <SelectItem key={it.value} value={it.value}>
            {it.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

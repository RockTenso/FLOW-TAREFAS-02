"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createDepartmentAction,
  createClientAction,
  createTagAction,
  setDepartmentActiveAction,
  setClientActiveAction,
} from "@/server/actions";

type Kind = "department" | "client" | "tag";
type Item = { id: string; name: string; active?: boolean; count: number };

const CREATE = {
  department: createDepartmentAction,
  client: createClientAction,
  tag: createTagAction,
};

export function EntityManager({
  kind,
  title,
  placeholder,
  items,
}: {
  kind: Kind;
  title: string;
  placeholder: string;
  items: Item[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function create() {
    const value = name.trim();
    if (!value) return;
    startTransition(async () => {
      const res = await CREATE[kind](value);
      if (res.ok) {
        setName("");
        toast.success(`${title}: “${value}” adicionado.`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function toggle(id: string, active: boolean) {
    startTransition(async () => {
      if (kind === "department") await setDepartmentActiveAction(id, active);
      else if (kind === "client") await setClientActiveAction(id, active);
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="mb-3 font-semibold">{title}</h2>
      <div className="mb-3 flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              create();
            }
          }}
          placeholder={placeholder}
        />
        <Button onClick={create} disabled={pending} size="sm">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Adicionar
        </Button>
      </div>
      <ul className="divide-y text-sm">
        {items.length === 0 && (
          <li className="py-2 text-muted-foreground">Nenhum registro ainda.</li>
        )}
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 py-2">
            <span className={item.active === false ? "text-muted-foreground line-through" : ""}>
              {kind === "tag" ? `#${item.name}` : item.name}
              <span className="ml-2 text-xs text-muted-foreground">({item.count})</span>
            </span>
            {kind !== "tag" && (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => toggle(item.id, !(item.active ?? true))}
              >
                {item.active === false ? "Reativar" : "Desativar"}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

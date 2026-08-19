import Link from "next/link";
import { Plus } from "lucide-react";
import type { TaskStatus, Importance } from "@prisma/client";
import { getTasks, getFormOptions, type TaskFilters as Filters } from "@/server/queries";
import { STATUS_ORDER, IMPORTANCE_ORDER } from "@/lib/labels";
import { TaskCardItem } from "@/components/task-card";
import { TaskFilters } from "@/components/task-filters";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

const QUICK_VALUES = ["mine", "today", "overdue", "running", "completed"] as const;

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const sp = await searchParams;
  const options = await getFormOptions();

  const statusRaw = first(sp.status);
  const importanceRaw = first(sp.importance);
  const quickRaw = first(sp.quick);

  const filters: Filters = {
    q: first(sp.q),
    status: STATUS_ORDER.includes(statusRaw as TaskStatus)
      ? (statusRaw as TaskStatus)
      : undefined,
    importance: IMPORTANCE_ORDER.includes(importanceRaw as Importance)
      ? (importanceRaw as Importance)
      : undefined,
    responsibleId: first(sp.responsibleId),
    departmentId: first(sp.departmentId),
    clientId: first(sp.clientId),
    tagId: first(sp.tagId),
    quick: (QUICK_VALUES as readonly string[]).includes(quickRaw ?? "")
      ? (quickRaw as Filters["quick"])
      : undefined,
  };

  const tasks = await getTasks(filters);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tarefas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"}
            {filters.q ? ` para “${filters.q}”` : ""}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/tasks/new">
            <Plus className="size-4" /> Nova tarefa
          </Link>
        </Button>
      </div>

      <TaskFilters options={options} />

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhuma tarefa encontrada com os filtros atuais.
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {tasks.map((task) => (
            <TaskCardItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

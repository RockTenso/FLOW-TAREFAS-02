"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import type { TaskStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { STATUS_META, KANBAN_COLUMNS } from "@/lib/labels";
import type { TaskCard } from "@/server/queries";
import { TaskCodeBadge } from "@/components/badges";
import { TaskTimer } from "@/components/task-timer";
import { moveTaskStatusAction } from "@/server/actions";

type Columns = Record<TaskStatus, TaskCard[]>;

export function KanbanBoard({ data }: { data: Columns }) {
  const router = useRouter();
  const [columns, setColumns] = useState<Columns>(data);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => setColumns(data), [data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const columnOf = (taskId: string): TaskStatus | undefined =>
    (Object.keys(columns) as TaskStatus[]).find((s) =>
      columns[s].some((t) => t.id === taskId),
    );

  const activeTask = activeId
    ? Object.values(columns).flat().find((t) => t.id === activeId) ?? null
    : null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const taskId = String(e.active.id);
    const target = e.over?.id as TaskStatus | undefined;
    if (!target || !KANBAN_COLUMNS.includes(target)) return;
    const from = columnOf(taskId);
    if (!from || from === target) return;

    const task = columns[from].find((t) => t.id === taskId);
    if (!task) return;

    // Atualização otimista
    setColumns((prev) => ({
      ...prev,
      [from]: prev[from].filter((t) => t.id !== taskId),
      [target]: [{ ...task, status: target }, ...prev[target]],
    }));

    startTransition(async () => {
      const res = await moveTaskStatusAction(taskId, target);
      if (!res.ok) toast.error("Não foi possível mover a tarefa.");
      router.refresh();
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {KANBAN_COLUMNS.map((status) => (
          <Column key={status} status={status} tasks={columns[status]} />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <KanbanCard task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ status, tasks }: { status: TaskStatus; tasks: TaskCard[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-40 flex-col rounded-xl border bg-muted/30 p-2 transition-colors",
        isOver && "ring-2 ring-primary/50",
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <span className={cn("size-2 rounded-full", meta.dot)} />
          {meta.label}
        </span>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {tasks.map((task) => (
          <DraggableCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ task }: { task: TaskCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn("touch-none", isDragging && "opacity-40")}
    >
      <KanbanCard task={task} />
    </div>
  );
}

function KanbanCard({ task, overlay }: { task: TaskCard; overlay?: boolean }) {
  return (
    <div
      className={cn(
        "cursor-grab rounded-lg border bg-card p-2.5 shadow-sm active:cursor-grabbing",
        overlay && "rotate-2 shadow-lg",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <TaskCodeBadge code={task.taskCode} />
        <TaskTimer
          baseSeconds={task.baseSeconds}
          activeStartedAt={task.activeStartedAt}
          running={task.running}
          className="font-mono text-[11px] text-muted-foreground"
        />
      </div>
      <Link
        href={`/tasks/${task.id}`}
        onPointerDown={(e) => e.stopPropagation()}
        className="mt-1.5 block text-sm font-medium leading-snug hover:underline"
      >
        {task.title}
      </Link>
      {(task.client || task.department) && (
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {[task.client?.name, task.department?.name].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}

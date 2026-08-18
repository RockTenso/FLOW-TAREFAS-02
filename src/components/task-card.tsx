import Link from "next/link";
import type { TaskCard as TaskCardData } from "@/server/queries";
import { TaskCodeBadge, StatusBadge, UrgencyText } from "./badges";
import { PlayButton } from "./play-button";
import { TaskTimer } from "./task-timer";
import { formatDate } from "@/lib/format";

export function TaskCardItem({
  task,
  showStatus = true,
}: {
  task: TaskCardData;
  showStatus?: boolean;
}) {
  const canRun = task.status !== "COMPLETED" && task.status !== "CANCELLED";
  const meta = [task.client?.name, task.department?.name].filter(Boolean).join(" · ");

  return (
    <div className="rounded-lg border bg-card p-3 transition-colors hover:bg-accent/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <TaskCodeBadge code={task.taskCode} />
            {showStatus && <StatusBadge status={task.status} />}
          </div>
          <Link
            href={`/tasks/${task.id}`}
            className="mt-1.5 block font-medium leading-snug hover:underline"
          >
            {task.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {meta && <span>{meta}</span>}
            {task.dueDate && (
              <>
                {meta && <span aria-hidden>·</span>}
                <span>vence {formatDate(task.dueDate)}</span>
              </>
            )}
            <UrgencyText dueDate={task.dueDate} />
          </div>
          {task.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {task.tags.map((t) => (
                <span
                  key={t.id}
                  className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground"
                >
                  #{t.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {canRun && <PlayButton taskId={task.id} running={task.running} />}
          <TaskTimer
            baseSeconds={task.baseSeconds}
            activeStartedAt={task.activeStartedAt}
            running={task.running}
            className="font-mono text-xs text-muted-foreground"
          />
        </div>
      </div>
    </div>
  );
}

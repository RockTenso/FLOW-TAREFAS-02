import type { TaskStatus, Importance } from "@prisma/client";
import { cn } from "@/lib/utils";
import { STATUS_META, IMPORTANCE_META } from "@/lib/labels";
import { computeUrgency, URGENCY_META } from "@/lib/eisenhower";

export function TaskCodeBadge({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium tracking-tight text-muted-foreground",
        className,
      )}
    >
      {code}
    </span>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        meta.badge,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function ImportanceBadge({ importance }: { importance: Importance }) {
  const meta = IMPORTANCE_META[importance];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        meta.badge,
      )}
    >
      {meta.label}
    </span>
  );
}

export function UrgencyText({
  dueDate,
  className,
}: {
  dueDate: string | Date | null;
  className?: string;
}) {
  const level = computeUrgency(dueDate ?? null);
  const meta = URGENCY_META[level];
  return <span className={cn("text-xs font-medium", meta.className, className)}>{meta.label}</span>;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { getTaskDetail } from "@/server/queries";
import { totalSeconds } from "@/lib/time-utils";
import { formatDate, formatDateTime, formatTime, formatDuration } from "@/lib/format";
import { STATUS_META, IMPORTANCE_META, HISTORY_ACTION_LABEL } from "@/lib/labels";
import { TaskCodeBadge, StatusBadge, ImportanceBadge, UrgencyText } from "@/components/badges";
import { PlayButton } from "@/components/play-button";
import { TaskTimer } from "@/components/task-timer";
import { TaskDetailActions } from "@/components/task-detail-actions";
import { CommentForm } from "@/components/comment-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

function humanValue(field: string | null, value: string | null): string {
  if (value == null || value === "") return "—";
  if (field === "status" && value in STATUS_META) {
    return STATUS_META[value as keyof typeof STATUS_META].label;
  }
  if (field === "importance" && value in IMPORTANCE_META) {
    return IMPORTANCE_META[value as keyof typeof IMPORTANCE_META].label;
  }
  return value;
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

export default async function TaskDetailPage({ params }: PageProps<"/tasks/[id]">) {
  const { id } = await params;
  const task = await getTaskDetail(id);
  if (!task) notFound();

  const canRun = task.status !== "COMPLETED" && task.status !== "CANCELLED";
  const active = task.timeEntries.find((e) => !e.endedAt);
  const baseSeconds = task.timeEntries
    .filter((e) => e.endedAt)
    .reduce((acc, e) => acc + (e.durationSeconds ?? 0), 0);
  const initialTotal = totalSeconds(task.timeEntries);

  return (
    <div className="space-y-6">
      <Link
        href="/tasks"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para tarefas
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TaskCodeBadge code={task.taskCode} className="text-sm" />
            <StatusBadge status={task.status} />
            <ImportanceBadge importance={task.importance} />
            <UrgencyText dueDate={task.dueDate ? task.dueDate.toISOString() : null} />
          </div>
          <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight">
            {task.title}
          </h1>
        </div>
        <TaskDetailActions taskId={task.id} status={task.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border bg-card p-5">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <MetaItem label="Cliente">{task.client?.name ?? "—"}</MetaItem>
              <MetaItem label="Departamento">{task.department?.name ?? "—"}</MetaItem>
              <MetaItem label="Responsável">{task.responsible?.name ?? "—"}</MetaItem>
              <MetaItem label="Prazo">{formatDate(task.dueDate)}</MetaItem>
              <MetaItem label="Importância">{IMPORTANCE_META[task.importance].label}</MetaItem>
              <MetaItem label="Estimativa">
                {task.estimatedMinutes != null ? `${task.estimatedMinutes} min` : "—"}
              </MetaItem>
              <MetaItem label="Criada por">{task.createdBy?.name ?? "—"}</MetaItem>
              <MetaItem label="Criada em">{formatDateTime(task.createdAt)}</MetaItem>
              {task.completedAt && (
                <MetaItem label="Concluída em">{formatDateTime(task.completedAt)}</MetaItem>
              )}
            </dl>
            {task.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {task.tags.map((t) => (
                  <span
                    key={t.id}
                    className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                  >
                    #{t.name}
                  </span>
                ))}
              </div>
            )}
          </section>

          {task.description && (
            <section className="rounded-xl border bg-card p-5">
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">Descrição</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{task.description}</p>
            </section>
          )}

          <section className="rounded-xl border bg-card">
            <Tabs defaultValue="history" className="w-full">
              <div className="border-b px-4 pt-3">
                <TabsList>
                  <TabsTrigger value="history">
                    Histórico ({task.histories.length})
                  </TabsTrigger>
                  <TabsTrigger value="sessions">
                    Sessões ({task.timeEntries.length})
                  </TabsTrigger>
                  <TabsTrigger value="comments">
                    Comentários ({task.comments.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="history" className="p-4">
                <ol className="space-y-3">
                  {task.histories.map((h) => (
                    <li key={h.id} className="flex gap-3 text-sm">
                      <div className="mt-1 size-2 shrink-0 rounded-full bg-border" />
                      <div className="min-w-0">
                        <p className="font-medium">{HISTORY_ACTION_LABEL[h.action]}</p>
                        {(h.oldValue || h.newValue) && (
                          <p className="text-muted-foreground">
                            {h.field === "tag" ? (
                              <>{h.newValue ? `#${h.newValue}` : `#${h.oldValue}`}</>
                            ) : (
                              <>
                                De: {humanValue(h.field, h.oldValue)} → Para:{" "}
                                {humanValue(h.field, h.newValue)}
                              </>
                            )}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {h.user?.name ?? "Sistema"} · {formatDateTime(h.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </TabsContent>

              <TabsContent value="sessions" className="p-4">
                {task.timeEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma sessão registrada ainda.</p>
                ) : (
                  <ul className="space-y-2">
                    {task.timeEntries.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                      >
                        <span className="font-mono text-muted-foreground">
                          {formatTime(e.startedAt)} →{" "}
                          {e.endedAt ? (
                            formatTime(e.endedAt)
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              em andamento
                            </span>
                          )}
                        </span>
                        <span className="font-medium">
                          {e.endedAt
                            ? formatDuration(e.durationSeconds ?? 0)
                            : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="comments" className="space-y-4 p-4">
                {task.comments.length > 0 && (
                  <ul className="space-y-3">
                    {task.comments.map((c) => (
                      <li key={c.id} className="rounded-lg border p-3 text-sm">
                        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{c.user.name}</span>
                          <span>·</span>
                          <span>{formatDateTime(c.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{c.content}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <CommentForm taskId={task.id} />
              </TabsContent>
            </Tabs>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-4" /> Tempo total
            </div>
            <div className="mt-2">
              <TaskTimer
                baseSeconds={baseSeconds}
                activeStartedAt={active ? active.startedAt.toISOString() : null}
                running={!!active}
                className="font-mono text-3xl font-semibold"
              />
            </div>
            {task.estimatedMinutes != null && (
              <p className="mt-1 text-xs text-muted-foreground">
                Estimado: {task.estimatedMinutes} min · Registrado:{" "}
                {formatDuration(initialTotal)}
              </p>
            )}
            {canRun && (
              <div className="mt-4">
                <PlayButton taskId={task.id} running={!!active} labelled size="lg" />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

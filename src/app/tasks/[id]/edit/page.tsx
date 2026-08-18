import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTaskDetail, getFormOptions } from "@/server/queries";
import { getCurrentUser } from "@/lib/current-user";
import { TaskForm } from "@/components/task-form";

export const dynamic = "force-dynamic";

export default async function EditTaskPage({ params }: PageProps<"/tasks/[id]/edit">) {
  const { id } = await params;
  const [task, options, user] = await Promise.all([
    getTaskDetail(id),
    getFormOptions(),
    getCurrentUser(),
  ]);
  if (!task) notFound();

  const initial = {
    id: task.id,
    title: task.title,
    description: task.description,
    importance: task.importance,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    estimatedMinutes: task.estimatedMinutes,
    responsibleId: task.responsibleId,
    departmentId: task.departmentId,
    clientId: task.clientId,
    status: task.status,
    tagIds: task.tags.map((t) => t.id),
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/tasks/${task.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar
      </Link>
      <h1 className="mt-3 text-xl font-semibold tracking-tight">
        Editar {task.taskCode}
      </h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Toda alteração relevante é registrada no histórico da tarefa.
      </p>
      <div className="rounded-xl border bg-card p-5">
        <TaskForm mode="edit" options={options} currentUserId={user.id} initial={initial} />
      </div>
    </div>
  );
}

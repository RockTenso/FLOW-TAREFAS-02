import { getFormOptions } from "@/server/queries";
import { getCurrentUser } from "@/lib/current-user";
import { TaskForm } from "@/components/task-form";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const [options, user] = await Promise.all([getFormOptions(), getCurrentUser()]);
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight">Nova tarefa</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Abrir → enxergar → executar → medir → concluir.
      </p>
      <div className="rounded-xl border bg-card p-5">
        <TaskForm mode="create" options={options} currentUserId={user.id} />
      </div>
    </div>
  );
}

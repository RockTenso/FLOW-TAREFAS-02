import { getMatrixData } from "@/server/queries";
import { QUADRANT_META, QUADRANT_ORDER } from "@/lib/eisenhower";
import { TaskCardItem } from "@/components/task-card";

export const dynamic = "force-dynamic";

export default async function MatrixPage() {
  const groups = await getMatrixData();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Matriz de Eisenhower</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A importância você define; a urgência é calculada automaticamente pelo prazo.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {QUADRANT_ORDER.map((q) => {
          const meta = QUADRANT_META[q];
          const tasks = groups[q];
          return (
            <section
              key={q}
              className={`overflow-hidden rounded-xl border border-l-4 bg-card ${meta.accent}`}
            >
              <header className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <h2 className="flex items-center gap-2 font-semibold">
                    <span>{meta.emoji}</span> {meta.title}
                  </h2>
                  <p className="text-xs text-muted-foreground">{meta.subtitle}</p>
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {tasks.length}
                </span>
              </header>
              <div className="space-y-2 p-3">
                {tasks.length === 0 ? (
                  <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                    Nenhuma tarefa aqui.
                  </p>
                ) : (
                  tasks.map((task) => <TaskCardItem key={task.id} task={task} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

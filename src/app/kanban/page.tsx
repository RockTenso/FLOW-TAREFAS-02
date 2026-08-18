import { getKanbanData } from "@/server/queries";
import { KanbanBoard } from "@/components/kanban-board";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  const data = await getKanbanData();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Kanban</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Arraste os cartões para mudar o status. Mover para “Em execução” inicia o
          cronômetro (pausando outra tarefa ativa, se houver).
        </p>
      </div>
      <KanbanBoard data={data} />
    </div>
  );
}

import Link from "next/link";
import {
  ListTodo,
  CalendarClock,
  AlertTriangle,
  Timer,
  CheckCircle2,
} from "lucide-react";
import { getDashboardData } from "@/server/queries";
import { formatDuration } from "@/lib/format";
import { TaskCardItem } from "@/components/task-card";
import { TaskCodeBadge } from "@/components/badges";
import { TaskTimer } from "@/components/task-timer";
import { PlayButton } from "@/components/play-button";

export const dynamic = "force-dynamic";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function StatCard({
  icon: Icon,
  value,
  label,
  accent,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`size-4 ${accent ?? "text-muted-foreground"}`} />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const { metrics } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {greeting()}, {data.userName}.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O que você precisa fazer agora?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={ListTodo} value={metrics.pendentes} label="Pendentes" />
        <StatCard icon={CalendarClock} value={metrics.hoje} label="Para hoje" />
        <StatCard
          icon={AlertTriangle}
          value={metrics.atrasadas}
          label="Atrasadas"
          accent={metrics.atrasadas > 0 ? "text-red-500" : undefined}
        />
        <StatCard
          icon={Timer}
          value={formatDuration(metrics.secondsToday)}
          label="Tempo hoje"
        />
        <StatCard icon={CheckCircle2} value={metrics.concluidasHoje} label="Concluídas hoje" />
      </div>

      {data.active && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-50/60 p-4 dark:bg-emerald-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                Em execução
              </div>
              <div className="flex items-center gap-2">
                <TaskCodeBadge code={data.active.taskCode} />
                <Link href={`/tasks/${data.active.id}`} className="font-medium hover:underline">
                  {data.active.title}
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <TaskTimer
                baseSeconds={data.active.baseSeconds}
                activeStartedAt={data.active.activeStartedAt}
                running
                className="font-mono text-2xl font-semibold"
              />
              <PlayButton taskId={data.active.id} running labelled size="default" />
            </div>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔴</span>
          <h2 className="font-semibold">Fazer agora</h2>
          <span className="text-sm text-muted-foreground">({data.doNow.length})</span>
        </div>
        {data.doNow.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Nada urgente e importante no momento. 🎉
          </p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {data.doNow.map((task) => (
              <TaskCardItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🟠</span>
          <h2 className="font-semibold">Planejar</h2>
          <span className="text-sm text-muted-foreground">({data.plan.length})</span>
        </div>
        {data.plan.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Nenhuma tarefa importante para planejar.
          </p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {data.plan.map((task) => (
              <TaskCardItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

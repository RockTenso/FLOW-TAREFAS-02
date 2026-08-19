import "server-only";
import { startOfDay, endOfDay } from "date-fns";
import type { Prisma, TaskStatus, Importance } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { computeQuadrant, computeUrgency, isUrgent, type Quadrant } from "@/lib/eisenhower";
import { entrySeconds } from "@/lib/time-utils";

const ACTIVE_STATUSES: TaskStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "PAUSED"];

const taskCardInclude = {
  responsible: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  client: { select: { id: true, name: true } },
  tags: { select: { id: true, name: true }, orderBy: { name: "asc" } },
  timeEntries: {
    select: { startedAt: true, endedAt: true, durationSeconds: true },
  },
} satisfies Prisma.TaskInclude;

type TaskWithCard = Prisma.TaskGetPayload<{ include: typeof taskCardInclude }>;

export type TaskCard = {
  id: string;
  taskCode: string;
  title: string;
  status: TaskStatus;
  importance: Importance;
  dueDate: string | null;
  responsible: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  client: { id: string; name: string } | null;
  tags: { id: string; name: string }[];
  baseSeconds: number;
  activeStartedAt: string | null;
  running: boolean;
  estimatedMinutes: number | null;
  quadrant: Quadrant;
};

function toTaskCard(task: TaskWithCard): TaskCard {
  let baseSeconds = 0;
  let activeStartedAt: string | null = null;
  for (const e of task.timeEntries) {
    if (e.endedAt) baseSeconds += entrySeconds(e);
    else activeStartedAt = e.startedAt.toISOString();
  }
  return {
    id: task.id,
    taskCode: task.taskCode,
    title: task.title,
    status: task.status,
    importance: task.importance,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    responsible: task.responsible,
    department: task.department,
    client: task.client,
    tags: task.tags,
    baseSeconds,
    activeStartedAt,
    running: activeStartedAt !== null,
    estimatedMinutes: task.estimatedMinutes,
    quadrant: computeQuadrant(task.importance, task.dueDate),
  };
}

// ---------------------------------------------------------------------------
// Opções para formulários e filtros
// ---------------------------------------------------------------------------

export async function getFormOptions() {
  const [users, departments, clients, tags] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.department.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.client.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { users, departments, clients, tags };
}

// ---------------------------------------------------------------------------
// Lista de tarefas com filtros e busca
// ---------------------------------------------------------------------------

export type TaskFilters = {
  q?: string;
  status?: TaskStatus;
  responsibleId?: string;
  departmentId?: string;
  clientId?: string;
  importance?: Importance;
  tagId?: string;
  quick?: "mine" | "today" | "overdue" | "running" | "completed";
};

export async function getTasks(filters: TaskFilters): Promise<TaskCard[]> {
  const now = new Date();
  const and: Prisma.TaskWhereInput[] = [{ deletedAt: null }];

  if (filters.status) and.push({ status: filters.status });
  if (filters.responsibleId) and.push({ responsibleId: filters.responsibleId });
  if (filters.departmentId) and.push({ departmentId: filters.departmentId });
  if (filters.clientId) and.push({ clientId: filters.clientId });
  if (filters.importance) and.push({ importance: filters.importance });
  if (filters.tagId) and.push({ tags: { some: { id: filters.tagId } } });

  if (filters.quick === "mine") {
    const user = await getCurrentUser();
    and.push({ responsibleId: user.id });
  } else if (filters.quick === "today") {
    and.push({
      dueDate: { gte: startOfDay(now), lte: endOfDay(now) },
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    });
  } else if (filters.quick === "overdue") {
    and.push({
      dueDate: { lt: startOfDay(now) },
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    });
  } else if (filters.quick === "running") {
    and.push({ status: "IN_PROGRESS" });
  } else if (filters.quick === "completed") {
    and.push({ status: "COMPLETED" });
  }

  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim();
    and.push({
      OR: [
        { taskCode: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { client: { name: { contains: q, mode: "insensitive" } } },
        { department: { name: { contains: q, mode: "insensitive" } } },
        { responsible: { name: { contains: q, mode: "insensitive" } } },
        { tags: { some: { name: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }

  const tasks = await prisma.task.findMany({
    where: { AND: and },
    include: taskCardInclude,
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });
  return tasks.map(toTaskCard);
}

// ---------------------------------------------------------------------------
// Detalhe da tarefa
// ---------------------------------------------------------------------------

export async function getTaskDetail(id: string) {
  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null },
    include: {
      responsible: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      tags: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      timeEntries: {
        orderBy: { startedAt: "asc" },
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          durationSeconds: true,
        },
      },
      histories: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true } } },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  return task;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getDashboardData() {
  const user = await getCurrentUser();
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [pendentes, hoje, atrasadas, concluidasHoje, activeTasks, todayEntries, active] =
    await Promise.all([
      prisma.task.count({
        where: { deletedAt: null, status: { in: ACTIVE_STATUSES } },
      }),
      prisma.task.count({
        where: {
          deletedAt: null,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          dueDate: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.task.count({
        where: {
          deletedAt: null,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          dueDate: { lt: todayStart },
        },
      }),
      prisma.task.count({
        where: { deletedAt: null, status: "COMPLETED", completedAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.task.findMany({
        where: { deletedAt: null, status: { notIn: ["COMPLETED", "CANCELLED"] } },
        include: taskCardInclude,
      }),
      prisma.timeEntry.findMany({
        where: { startedAt: { gte: todayStart } },
        select: { startedAt: true, endedAt: true, durationSeconds: true },
      }),
      prisma.timeEntry.findFirst({
        where: { userId: user.id, endedAt: null },
        orderBy: { startedAt: "desc" },
        select: {
          startedAt: true,
          task: { select: { id: true, taskCode: true, title: true } },
        },
      }),
    ]);

  const secondsToday = todayEntries.reduce((acc, e) => acc + entrySeconds(e, now.getTime()), 0);

  const cards = activeTasks.map(toTaskCard);
  const doNow = cards
    .filter((t) => t.quadrant === "DO_NOW")
    .sort(sortByUrgencyThenDue);
  const plan = cards.filter((t) => t.quadrant === "PLAN").sort(sortByDue);

  // tempo total investido na tarefa ativa (para o cronômetro do destaque)
  let activeCard: (TaskCard & { activeStartedAt: string }) | null = null;
  if (active) {
    const found = cards.find((c) => c.id === active.task.id);
    activeCard = found
      ? ({ ...found, activeStartedAt: active.startedAt.toISOString() } as TaskCard & {
          activeStartedAt: string;
        })
      : null;
  }

  return {
    userName: user.name,
    metrics: { pendentes, hoje, atrasadas, concluidasHoje, secondsToday },
    doNow,
    plan,
    active: activeCard,
  };
}

function sortByDue(a: TaskCard, b: TaskCard): number {
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate.localeCompare(b.dueDate);
}

const URGENCY_WEIGHT: Record<string, number> = {
  OVERDUE: 0,
  TODAY: 1,
  SOON: 2,
  MEDIUM: 3,
  LOW: 4,
  NONE: 5,
};

function sortByUrgencyThenDue(a: TaskCard, b: TaskCard): number {
  const ua = URGENCY_WEIGHT[computeUrgency(a.dueDate)];
  const ub = URGENCY_WEIGHT[computeUrgency(b.dueDate)];
  if (ua !== ub) return ua - ub;
  return sortByDue(a, b);
}

// ---------------------------------------------------------------------------
// Matriz de Eisenhower
// ---------------------------------------------------------------------------

export async function getMatrixData() {
  const tasks = await prisma.task.findMany({
    where: { deletedAt: null, status: { notIn: ["COMPLETED", "CANCELLED"] } },
    include: taskCardInclude,
  });
  const cards = tasks.map(toTaskCard);
  const groups: Record<Quadrant, TaskCard[]> = {
    DO_NOW: [],
    PLAN: [],
    DELEGATE: [],
    ELIMINATE: [],
  };
  for (const card of cards) groups[card.quadrant].push(card);
  for (const key of Object.keys(groups) as Quadrant[]) {
    groups[key].sort(sortByUrgencyThenDue);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Kanban
// ---------------------------------------------------------------------------

export async function getKanbanData() {
  const tasks = await prisma.task.findMany({
    where: { deletedAt: null },
    include: taskCardInclude,
    orderBy: [{ importance: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }],
  });
  const cards = tasks.map(toTaskCard);
  const byStatus: Record<TaskStatus, TaskCard[]> = {
    BACKLOG: [],
    TODO: [],
    IN_PROGRESS: [],
    PAUSED: [],
    COMPLETED: [],
    CANCELLED: [],
  };
  for (const card of cards) byStatus[card.status].push(card);
  return byStatus;
}

// ---------------------------------------------------------------------------
// Cadastros
// ---------------------------------------------------------------------------

export async function getSettingsData() {
  const [departments, clients, tags, users] = await Promise.all([
    prisma.department.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { tasks: true } } },
    }),
    prisma.client.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { tasks: true } } },
    }),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { tasks: true } } },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { departments, clients, tags, users };
}

export { isUrgent };

import type { TaskStatus, Importance, HistoryAction } from "@prisma/client";

export const STATUS_META: Record<
  TaskStatus,
  { label: string; badge: string; dot: string }
> = {
  BACKLOG: {
    label: "Backlog",
    badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    dot: "bg-gray-400",
  },
  TODO: {
    label: "A fazer",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  IN_PROGRESS: {
    label: "Em execução",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  PAUSED: {
    label: "Pausada",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  COMPLETED: {
    label: "Concluída",
    badge: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    dot: "bg-green-600",
  },
  CANCELLED: {
    label: "Cancelada",
    badge: "bg-gray-100 text-gray-500 line-through dark:bg-gray-800 dark:text-gray-500",
    dot: "bg-gray-400",
  },
};

export const STATUS_ORDER: TaskStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
];

/** Colunas exibidas no Kanban (Cancelada fica fora do fluxo principal). */
export const KANBAN_COLUMNS: TaskStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "PAUSED",
  "COMPLETED",
];

export const IMPORTANCE_META: Record<
  Importance,
  { label: string; badge: string }
> = {
  HIGH: {
    label: "Alta",
    badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
  MEDIUM: {
    label: "Média",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  LOW: {
    label: "Baixa",
    badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
};

export const IMPORTANCE_ORDER: Importance[] = ["HIGH", "MEDIUM", "LOW"];

/** Texto legível para cada evento do histórico. */
export const HISTORY_ACTION_LABEL: Record<HistoryAction, string> = {
  TASK_CREATED: "Tarefa criada",
  TASK_UPDATED: "Tarefa atualizada",
  TITLE_CHANGED: "Título alterado",
  DESCRIPTION_CHANGED: "Descrição alterada",
  DUE_DATE_CHANGED: "Prazo alterado",
  IMPORTANCE_CHANGED: "Importância alterada",
  STATUS_CHANGED: "Status alterado",
  RESPONSIBLE_CHANGED: "Responsável alterado",
  DEPARTMENT_CHANGED: "Departamento alterado",
  CLIENT_CHANGED: "Cliente alterado",
  ESTIMATE_CHANGED: "Estimativa alterada",
  TAG_ADDED: "Tag adicionada",
  TAG_REMOVED: "Tag removida",
  TASK_STARTED: "Execução iniciada",
  TASK_PAUSED: "Execução pausada",
  TASK_RESUMED: "Execução retomada",
  TASK_COMPLETED: "Tarefa concluída",
  TASK_CANCELLED: "Tarefa cancelada",
  COMMENT_ADDED: "Comentário adicionado",
};

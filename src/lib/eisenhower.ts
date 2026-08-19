import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { Importance } from "@prisma/client";

export type UrgencyLevel = "OVERDUE" | "TODAY" | "SOON" | "MEDIUM" | "LOW" | "NONE";
export type Quadrant = "DO_NOW" | "PLAN" | "DELEGATE" | "ELIMINATE";

/**
 * Urgência calculada exclusivamente a partir do prazo (nunca definida à mão).
 */
export function computeUrgency(
  dueDate: Date | string | null | undefined,
  now: Date = new Date(),
): UrgencyLevel {
  if (!dueDate) return "NONE";
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const days = differenceInCalendarDays(startOfDay(due), startOfDay(now));
  if (days < 0) return "OVERDUE";
  if (days === 0) return "TODAY";
  if (days <= 2) return "SOON";
  if (days <= 7) return "MEDIUM";
  return "LOW";
}

export function isUrgent(level: UrgencyLevel): boolean {
  return level === "OVERDUE" || level === "TODAY" || level === "SOON";
}

/** Importância definida pelo usuário: HIGH/MEDIUM = importante, LOW = não importante. */
export function isImportant(importance: Importance): boolean {
  return importance !== "LOW";
}

export function computeQuadrant(
  importance: Importance,
  dueDate: Date | string | null | undefined,
  now: Date = new Date(),
): Quadrant {
  const urgent = isUrgent(computeUrgency(dueDate, now));
  const important = isImportant(importance);
  if (important && urgent) return "DO_NOW";
  if (important && !urgent) return "PLAN";
  if (!important && urgent) return "DELEGATE";
  return "ELIMINATE";
}

export const URGENCY_META: Record<UrgencyLevel, { label: string; className: string }> = {
  OVERDUE: { label: "Atrasada", className: "text-red-600 dark:text-red-400" },
  TODAY: { label: "Vence hoje", className: "text-red-600 dark:text-red-400" },
  SOON: { label: "Vence em breve", className: "text-orange-500 dark:text-orange-400" },
  MEDIUM: { label: "Esta semana", className: "text-yellow-600 dark:text-yellow-400" },
  LOW: { label: "Sem pressa", className: "text-emerald-600 dark:text-emerald-400" },
  NONE: { label: "Sem prazo", className: "text-muted-foreground" },
};

export const QUADRANT_ORDER: Quadrant[] = ["DO_NOW", "PLAN", "DELEGATE", "ELIMINATE"];

export const QUADRANT_META: Record<
  Quadrant,
  { title: string; subtitle: string; emoji: string; accent: string }
> = {
  DO_NOW: {
    title: "FAZER AGORA",
    subtitle: "Importante e urgente",
    emoji: "🔴",
    accent: "border-l-red-500",
  },
  PLAN: {
    title: "PLANEJAR",
    subtitle: "Importante, não urgente",
    emoji: "🟠",
    accent: "border-l-orange-400",
  },
  DELEGATE: {
    title: "DELEGAR",
    subtitle: "Urgente, não importante",
    emoji: "🟡",
    accent: "border-l-yellow-400",
  },
  ELIMINATE: {
    title: "ELIMINAR",
    subtitle: "Nem urgente nem importante",
    emoji: "⚪",
    accent: "border-l-gray-300 dark:border-l-gray-600",
  },
};

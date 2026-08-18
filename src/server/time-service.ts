import "server-only";
import type { Prisma, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordHistory } from "./db-helpers";

export type ActiveEntry = {
  id: string;
  taskId: string;
  startedAt: Date;
  task: { id: string; taskCode: string; title: string };
};

export async function getActiveEntryForUser(userId: string): Promise<ActiveEntry | null> {
  return prisma.timeEntry.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      taskId: true,
      startedAt: true,
      task: { select: { id: true, taskCode: true, title: true } },
    },
  });
}

async function closeEntry(
  tx: Prisma.TransactionClient,
  entry: { id: string; startedAt: Date },
): Promise<number> {
  const endedAt = new Date();
  const durationSeconds = Math.max(
    0,
    Math.floor((endedAt.getTime() - entry.startedAt.getTime()) / 1000),
  );
  await tx.timeEntry.update({
    where: { id: entry.id },
    data: { endedAt, durationSeconds },
  });
  return durationSeconds;
}

export type StartResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" }
  | { ok: false; reason: "ALREADY_RUNNING" }
  | {
      ok: false;
      reason: "NEEDS_CONFIRMATION";
      activeTask: { id: string; taskCode: string; title: string };
    };

/**
 * Inicia (ou retoma) a execução de uma tarefa.
 * Regra: apenas uma tarefa em execução por usuário. Se já houver outra ativa,
 * exige confirmação (a menos que `force` = true, quando a anterior é pausada).
 */
export async function startExecution(
  userId: string,
  taskId: string,
  opts: { force?: boolean } = {},
): Promise<StartResult> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    select: { id: true },
  });
  if (!task) return { ok: false, reason: "NOT_FOUND" };

  const active = await getActiveEntryForUser(userId);
  if (active) {
    if (active.taskId === taskId) return { ok: false, reason: "ALREADY_RUNNING" };
    if (!opts.force) {
      return { ok: false, reason: "NEEDS_CONFIRMATION", activeTask: active.task };
    }
  }

  await prisma.$transaction(async (tx) => {
    if (active && active.taskId !== taskId) {
      const dur = await closeEntry(tx, active);
      await tx.task.update({
        where: { id: active.taskId },
        data: { status: "PAUSED" },
      });
      await recordHistory(tx, {
        taskId: active.taskId,
        userId,
        action: "TASK_PAUSED",
        metadata: { durationSeconds: dur, reason: "switch" },
      });
    }

    const priorCount = await tx.timeEntry.count({ where: { taskId } });
    await tx.timeEntry.create({
      data: { taskId, userId, startedAt: new Date() },
    });
    await tx.task.update({
      where: { id: taskId },
      data: { status: "IN_PROGRESS", completedAt: null },
    });
    await recordHistory(tx, {
      taskId,
      userId,
      action: priorCount > 0 ? "TASK_RESUMED" : "TASK_STARTED",
    });
  });

  return { ok: true };
}

export type SimpleResult = { ok: true } | { ok: false; reason: string };

export async function pauseExecution(userId: string, taskId: string): Promise<SimpleResult> {
  const active = await prisma.timeEntry.findFirst({
    where: { taskId, userId, endedAt: null },
    select: { id: true, startedAt: true },
  });
  if (!active) return { ok: false, reason: "NOT_RUNNING" };

  await prisma.$transaction(async (tx) => {
    const dur = await closeEntry(tx, active);
    await tx.task.update({ where: { id: taskId }, data: { status: "PAUSED" } });
    await recordHistory(tx, {
      taskId,
      userId,
      action: "TASK_PAUSED",
      metadata: { durationSeconds: dur },
    });
  });
  return { ok: true };
}

export async function completeExecution(userId: string, taskId: string): Promise<SimpleResult> {
  await prisma.$transaction(async (tx) => {
    const active = await tx.timeEntry.findFirst({
      where: { taskId, endedAt: null },
      select: { id: true, startedAt: true },
    });
    if (active) await closeEntry(tx, active);
    await tx.task.update({
      where: { id: taskId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await recordHistory(tx, { taskId, userId, action: "TASK_COMPLETED" });
  });
  return { ok: true };
}

export async function cancelExecution(userId: string, taskId: string): Promise<SimpleResult> {
  await prisma.$transaction(async (tx) => {
    const active = await tx.timeEntry.findFirst({
      where: { taskId, endedAt: null },
      select: { id: true, startedAt: true },
    });
    if (active) await closeEntry(tx, active);
    await tx.task.update({ where: { id: taskId }, data: { status: "CANCELLED" } });
    await recordHistory(tx, { taskId, userId, action: "TASK_CANCELLED" });
  });
  return { ok: true };
}

async function setStatusSimple(
  userId: string,
  taskId: string,
  from: TaskStatus,
  to: TaskStatus,
  closeActive: boolean,
): Promise<SimpleResult> {
  await prisma.$transaction(async (tx) => {
    if (closeActive) {
      const active = await tx.timeEntry.findFirst({
        where: { taskId, endedAt: null },
        select: { id: true, startedAt: true },
      });
      if (active) await closeEntry(tx, active);
    }
    await tx.task.update({
      where: { id: taskId },
      data: {
        status: to,
        completedAt: to === "COMPLETED" ? new Date() : from === "COMPLETED" ? null : undefined,
      },
    });
    await recordHistory(tx, {
      taskId,
      userId,
      action: "STATUS_CHANGED",
      field: "status",
      oldValue: from,
      newValue: to,
    });
  });
  return { ok: true };
}

/**
 * Movimentação de status pelo Kanban, respeitando as regras de execução.
 */
export async function moveTaskStatus(
  userId: string,
  taskId: string,
  target: TaskStatus,
): Promise<StartResult | SimpleResult> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!task) return { ok: false, reason: "NOT_FOUND" };
  if (task.status === target) return { ok: true };

  switch (target) {
    case "IN_PROGRESS":
      // Ao arrastar para "Em execução", pausa automaticamente qualquer outra ativa.
      return startExecution(userId, taskId, { force: true });
    case "COMPLETED":
      return completeExecution(userId, taskId);
    case "CANCELLED":
      return cancelExecution(userId, taskId);
    case "PAUSED": {
      const active = await prisma.timeEntry.findFirst({
        where: { taskId, userId, endedAt: null },
        select: { id: true },
      });
      if (active) return pauseExecution(userId, taskId);
      return setStatusSimple(userId, taskId, task.status, "PAUSED", false);
    }
    default:
      // BACKLOG / TODO: encerra sessão ativa (se houver) e ajusta status.
      return setStatusSimple(userId, taskId, task.status, target, true);
  }
}

import "server-only";
import type { HistoryAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nextTaskCode, recordHistory, type HistoryInput } from "./db-helpers";
import type { TaskCreateData } from "@/lib/validations";

/** Converte "yyyy-MM-dd" do <input type="date"> para Date (meio-dia local, evita virar o dia por fuso). */
export function parseDateInput(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateKey(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export async function createTask(userId: string, data: TaskCreateData) {
  const task = await prisma.$transaction(async (tx) => {
    const taskCode = await nextTaskCode(tx);
    const created = await tx.task.create({
      data: {
        taskCode,
        title: data.title,
        description: data.description ?? null,
        status: data.status ?? "TODO",
        importance: data.importance,
        dueDate: parseDateInput(data.dueDate),
        estimatedMinutes: data.estimatedMinutes ?? null,
        createdById: userId,
        responsibleId: data.responsibleId ?? userId,
        departmentId: data.departmentId ?? null,
        clientId: data.clientId ?? null,
        tags: data.tagIds.length
          ? { connect: data.tagIds.map((id) => ({ id })) }
          : undefined,
      },
      select: { id: true, taskCode: true },
    });
    await recordHistory(tx, {
      taskId: created.id,
      userId,
      action: "TASK_CREATED",
    });
    return created;
  });
  return task;
}

export async function updateTask(userId: string, taskId: string, data: TaskCreateData) {
  const before = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    include: { tags: { select: { id: true, name: true } } },
  });
  if (!before) throw new Error("Tarefa não encontrada.");

  // Mapas para resolver nomes legíveis no histórico
  const [users, departments, clients, tags] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true } }),
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.client.findMany({ select: { id: true, name: true } }),
    prisma.tag.findMany({ select: { id: true, name: true } }),
  ]);
  const userName = (id: string | null | undefined) =>
    id ? (users.find((u) => u.id === id)?.name ?? id) : "—";
  const deptName = (id: string | null | undefined) =>
    id ? (departments.find((d) => d.id === id)?.name ?? id) : "—";
  const clientName = (id: string | null | undefined) =>
    id ? (clients.find((c) => c.id === id)?.name ?? id) : "—";
  const tagName = (id: string) => tags.find((t) => t.id === id)?.name ?? id;

  const newDue = parseDateInput(data.dueDate);
  const newResponsible = data.responsibleId ?? null;
  const newDepartment = data.departmentId ?? null;
  const newClient = data.clientId ?? null;
  const newDescription = data.description ?? null;
  const newEstimate = data.estimatedMinutes ?? null;
  const newStatus = data.status ?? before.status;

  const changes: HistoryInput[] = [];
  const push = (
    action: HistoryAction,
    field: string,
    oldValue: string,
    newValue: string,
  ) => changes.push({ taskId, userId, action, field, oldValue, newValue });

  if (data.title !== before.title) {
    push("TITLE_CHANGED", "title", before.title, data.title);
  }
  if (newDescription !== before.description) {
    push("DESCRIPTION_CHANGED", "description", before.description ?? "—", newDescription ?? "—");
  }
  if (data.importance !== before.importance) {
    push("IMPORTANCE_CHANGED", "importance", before.importance, data.importance);
  }
  if (dateKey(newDue) !== dateKey(before.dueDate)) {
    push("DUE_DATE_CHANGED", "dueDate", dateKey(before.dueDate) || "—", dateKey(newDue) || "—");
  }
  if (newEstimate !== before.estimatedMinutes) {
    push(
      "ESTIMATE_CHANGED",
      "estimatedMinutes",
      before.estimatedMinutes != null ? String(before.estimatedMinutes) : "—",
      newEstimate != null ? String(newEstimate) : "—",
    );
  }
  if (newResponsible !== before.responsibleId) {
    push("RESPONSIBLE_CHANGED", "responsible", userName(before.responsibleId), userName(newResponsible));
  }
  if (newDepartment !== before.departmentId) {
    push("DEPARTMENT_CHANGED", "department", deptName(before.departmentId), deptName(newDepartment));
  }
  if (newClient !== before.clientId) {
    push("CLIENT_CHANGED", "client", clientName(before.clientId), clientName(newClient));
  }
  if (newStatus !== before.status) {
    push("STATUS_CHANGED", "status", before.status, newStatus);
  }

  // Diff de tags
  const beforeTagIds = before.tags.map((t) => t.id);
  const addedTags = data.tagIds.filter((id) => !beforeTagIds.includes(id));
  const removedTags = beforeTagIds.filter((id) => !data.tagIds.includes(id));
  for (const id of addedTags) {
    changes.push({ taskId, userId, action: "TAG_ADDED", field: "tag", newValue: tagName(id) });
  }
  for (const id of removedTags) {
    changes.push({ taskId, userId, action: "TAG_REMOVED", field: "tag", oldValue: tagName(id) });
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: taskId },
      data: {
        title: data.title,
        description: newDescription,
        importance: data.importance,
        dueDate: newDue,
        estimatedMinutes: newEstimate,
        responsibleId: newResponsible,
        departmentId: newDepartment,
        clientId: newClient,
        status: newStatus,
        completedAt:
          newStatus === "COMPLETED"
            ? (before.completedAt ?? new Date())
            : before.status === "COMPLETED"
              ? null
              : before.completedAt,
        tags: { set: data.tagIds.map((id) => ({ id })) },
      },
    });
    for (const change of changes) {
      await recordHistory(tx, change);
    }
  });

  return { id: taskId, changed: changes.length };
}

/** Soft delete: preserva o histórico e a rastreabilidade. */
export async function softDeleteTask(userId: string, taskId: string) {
  await prisma.$transaction(async (tx) => {
    const active = await tx.timeEntry.findFirst({
      where: { taskId, endedAt: null },
      select: { id: true, startedAt: true },
    });
    if (active) {
      const endedAt = new Date();
      await tx.timeEntry.update({
        where: { id: active.id },
        data: {
          endedAt,
          durationSeconds: Math.max(
            0,
            Math.floor((endedAt.getTime() - active.startedAt.getTime()) / 1000),
          ),
        },
      });
    }
    await tx.task.update({
      where: { id: taskId },
      data: { status: "CANCELLED", deletedAt: new Date() },
    });
    await recordHistory(tx, { taskId, userId, action: "TASK_CANCELLED", metadata: { softDeleted: true } });
  });
  return { ok: true };
}

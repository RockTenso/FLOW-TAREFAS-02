"use server";

import { revalidatePath } from "next/cache";
import type { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import {
  taskCreateSchema,
  taskUpdateSchema,
  commentSchema,
  namedEntitySchema,
  type TaskFormInput,
} from "@/lib/validations";
import { createTask, updateTask, softDeleteTask } from "./task-service";
import {
  startExecution,
  pauseExecution,
  completeExecution,
  cancelExecution,
  moveTaskStatus,
  type StartResult,
} from "./time-service";

function revalidateAll() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Tarefas
// ---------------------------------------------------------------------------

export type ActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

export async function createTaskAction(
  input: TaskFormInput,
): Promise<ActionResult<{ taskId: string; taskCode: string }>> {
  const parsed = taskCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const user = await getCurrentUser();
  const task = await createTask(user.id, parsed.data);
  revalidateAll();
  return { ok: true, taskId: task.id, taskCode: task.taskCode };
}

export async function updateTaskAction(
  input: TaskFormInput & { id: string },
): Promise<ActionResult> {
  const parsed = taskUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const user = await getCurrentUser();
  const { id, ...data } = parsed.data;
  await updateTask(user.id, id, data);
  revalidateAll();
  return { ok: true };
}

export async function deleteTaskAction(taskId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  await softDeleteTask(user.id, taskId);
  revalidateAll();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Execução (PLAY / PAUSE / concluir / cancelar / mover)
// ---------------------------------------------------------------------------

export async function startTaskAction(
  taskId: string,
  force = false,
): Promise<StartResult> {
  const user = await getCurrentUser();
  const result = await startExecution(user.id, taskId, { force });
  revalidateAll();
  return result;
}

export async function pauseTaskAction(taskId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  const result = await pauseExecution(user.id, taskId);
  revalidateAll();
  return result.ok ? { ok: true } : { ok: false, error: result.reason };
}

export async function completeTaskAction(taskId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  await completeExecution(user.id, taskId);
  revalidateAll();
  return { ok: true };
}

export async function cancelTaskAction(taskId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  await cancelExecution(user.id, taskId);
  revalidateAll();
  return { ok: true };
}

export async function moveTaskStatusAction(
  taskId: string,
  status: TaskStatus,
): Promise<ActionResult<{ needsConfirmation?: boolean }>> {
  const user = await getCurrentUser();
  const result = await moveTaskStatus(user.id, taskId, status);
  revalidateAll();
  if (result.ok) return { ok: true };
  if (result.reason === "NEEDS_CONFIRMATION") {
    return { ok: true, needsConfirmation: true };
  }
  return { ok: false, error: result.reason };
}

// ---------------------------------------------------------------------------
// Comentários
// ---------------------------------------------------------------------------

export async function addCommentAction(input: {
  taskId: string;
  content: string;
}): Promise<ActionResult> {
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Comentário inválido." };
  }
  const user = await getCurrentUser();
  await prisma.$transaction(async (tx) => {
    await tx.comment.create({
      data: { taskId: parsed.data.taskId, userId: user.id, content: parsed.data.content },
    });
    await tx.taskHistory.create({
      data: { taskId: parsed.data.taskId, userId: user.id, action: "COMMENT_ADDED" },
    });
  });
  revalidateAll();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Cadastros (departamentos / clientes / tags)
// ---------------------------------------------------------------------------

export async function createDepartmentAction(name: string): Promise<ActionResult> {
  const parsed = namedEntitySchema.safeParse({ name });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  try {
    await prisma.department.create({ data: { name: parsed.data.name } });
  } catch {
    return { ok: false, error: "Já existe um departamento com esse nome." };
  }
  revalidateAll();
  return { ok: true };
}

export async function createClientAction(name: string): Promise<ActionResult> {
  const parsed = namedEntitySchema.safeParse({ name });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  try {
    await prisma.client.create({ data: { name: parsed.data.name } });
  } catch {
    return { ok: false, error: "Já existe um cliente com esse nome." };
  }
  revalidateAll();
  return { ok: true };
}

export async function createTagAction(
  name: string,
): Promise<ActionResult<{ tag: { id: string; name: string } }>> {
  const parsed = namedEntitySchema.safeParse({ name });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  const clean = parsed.data.name.replace(/^#/, "").trim();
  if (!clean) return { ok: false, error: "Nome de tag inválido." };
  const existing = await prisma.tag.findUnique({ where: { name: clean } });
  if (existing) {
    return { ok: true, tag: { id: existing.id, name: existing.name } };
  }
  const tag = await prisma.tag.create({ data: { name: clean } });
  revalidateAll();
  return { ok: true, tag: { id: tag.id, name: tag.name } };
}

export async function setDepartmentActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  await prisma.department.update({ where: { id }, data: { active } });
  revalidateAll();
  return { ok: true };
}

export async function setClientActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  await prisma.client.update({ where: { id }, data: { active } });
  revalidateAll();
  return { ok: true };
}

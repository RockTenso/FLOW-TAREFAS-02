import "server-only";
import type { Prisma, HistoryAction } from "@prisma/client";
import { formatTaskCode } from "@/lib/task-code";

/**
 * Gera o próximo código amigável da tarefa (TF-000001) de forma atômica.
 * Deve ser chamado dentro de uma transação junto com a criação da tarefa.
 */
export async function nextTaskCode(tx: Prisma.TransactionClient): Promise<string> {
  const counter = await tx.counter.upsert({
    where: { name: "task" },
    update: { value: { increment: 1 } },
    create: { name: "task", value: 1 },
  });
  return formatTaskCode(counter.value);
}

export type HistoryInput = {
  taskId: string;
  userId: string | null;
  action: HistoryAction;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/** Registra um evento de auditoria (o histórico nunca é editável pela interface). */
export async function recordHistory(
  tx: Prisma.TransactionClient,
  input: HistoryInput,
) {
  return tx.taskHistory.create({
    data: {
      taskId: input.taskId,
      userId: input.userId,
      action: input.action,
      field: input.field ?? null,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
      metadata: input.metadata,
    },
  });
}

export async function recordManyHistory(
  tx: Prisma.TransactionClient,
  inputs: HistoryInput[],
) {
  for (const input of inputs) {
    await recordHistory(tx, input);
  }
}

import { z } from "zod";

export const importanceEnum = z.enum(["HIGH", "MEDIUM", "LOW"]);
export const statusEnum = z.enum([
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
]);

const optionalId = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "O título é obrigatório").max(200),
  description: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  importance: importanceEnum,
  dueDate: optionalDate,
  estimatedMinutes: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "" || v === null) return undefined;
      const n = typeof v === "string" ? Number(v) : v;
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
    }),
  responsibleId: optionalId,
  departmentId: optionalId,
  clientId: optionalId,
  tagIds: z.array(z.string()).optional().default([]),
  status: statusEnum.optional(),
});

export const taskUpdateSchema = taskCreateSchema.extend({
  id: z.string().min(1),
});

export const commentSchema = z.object({
  taskId: z.string().min(1),
  content: z.string().trim().min(1, "O comentário não pode ficar vazio").max(5000),
});

export const namedEntitySchema = z.object({
  name: z.string().trim().min(1, "O nome é obrigatório").max(120),
});

export type TaskFormInput = z.input<typeof taskCreateSchema>;
export type TaskCreateData = z.output<typeof taskCreateSchema>;

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import type { TaskStatus, Importance } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { IMPORTANCE_META, IMPORTANCE_ORDER, STATUS_META, STATUS_ORDER } from "@/lib/labels";
import { toDateInputValue } from "@/lib/format";
import { createTaskAction, updateTaskAction, createTagAction } from "@/server/actions";

type Option = { id: string; name: string };
const NONE = "none";

type FormValues = {
  title: string;
  description: string;
  importance: Importance;
  dueDate: string;
  estimatedMinutes: string;
  responsibleId: string;
  departmentId: string;
  clientId: string;
  status: TaskStatus;
};

export type TaskFormInitial = {
  id: string;
  title: string;
  description: string | null;
  importance: Importance;
  dueDate: string | null;
  estimatedMinutes: number | null;
  responsibleId: string | null;
  departmentId: string | null;
  clientId: string | null;
  status: TaskStatus;
  tagIds: string[];
};

export function TaskForm({
  mode,
  options,
  currentUserId,
  initial,
}: {
  mode: "create" | "edit";
  options: { users: Option[]; departments: Option[]; clients: Option[]; tags: Option[] };
  currentUserId: string;
  initial?: TaskFormInitial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tags, setTags] = useState<Option[]>(options.tags);
  const [selectedTags, setSelectedTags] = useState<string[]>(initial?.tagIds ?? []);
  const [newTag, setNewTag] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      importance: initial?.importance ?? "MEDIUM",
      dueDate: toDateInputValue(initial?.dueDate ?? null),
      estimatedMinutes:
        initial?.estimatedMinutes != null ? String(initial.estimatedMinutes) : "",
      responsibleId: initial?.responsibleId ?? currentUserId,
      departmentId: initial?.departmentId ?? NONE,
      clientId: initial?.clientId ?? NONE,
      status: initial?.status ?? "TODO",
    },
  });

  function toggleTag(id: string) {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  async function addTag() {
    const name = newTag.trim();
    if (!name) return;
    setAddingTag(true);
    const res = await createTagAction(name);
    setAddingTag(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setNewTag("");
    setTags((prev) =>
      prev.some((t) => t.id === res.tag.id) ? prev : [...prev, res.tag].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setSelectedTags((prev) => (prev.includes(res.tag.id) ? prev : [...prev, res.tag.id]));
  }

  function onSubmit(values: FormValues) {
    const payload = {
      title: values.title,
      description: values.description || undefined,
      importance: values.importance,
      dueDate: values.dueDate || undefined,
      estimatedMinutes: values.estimatedMinutes ? Number(values.estimatedMinutes) : undefined,
      responsibleId: values.responsibleId === NONE ? undefined : values.responsibleId,
      departmentId: values.departmentId === NONE ? undefined : values.departmentId,
      clientId: values.clientId === NONE ? undefined : values.clientId,
      tagIds: selectedTags,
      status: values.status,
    };

    startTransition(async () => {
      if (mode === "create") {
        const res = await createTaskAction(payload);
        if (res.ok) {
          toast.success(`Tarefa ${res.taskCode} criada.`);
          router.push(`/tasks/${res.taskId}`);
          router.refresh();
        } else {
          toast.error(res.error);
        }
      } else if (initial) {
        const res = await updateTaskAction({ ...payload, id: initial.id });
        if (res.ok) {
          toast.success("Tarefa atualizada.");
          router.push(`/tasks/${initial.id}`);
          router.refresh();
        } else {
          toast.error(res.error);
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">
          O que precisa ser feito? <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="Ex.: Resolver divergência dos boletos da 7 Mares"
          {...register("title", { required: "O título é obrigatório" })}
          aria-invalid={!!errors.title}
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          rows={3}
          placeholder="Detalhes, contexto, links…"
          {...register("description")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>
            Importância <span className="text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="importance"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORTANCE_ORDER.map((imp) => (
                    <SelectItem key={imp} value={imp}>
                      {IMPORTANCE_META[imp].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dueDate">Prazo (recomendado)</Label>
          <Input id="dueDate" type="date" {...register("dueDate")} />
        </div>

        <div className="space-y-1.5">
          <Label>Responsável</Label>
          <Controller
            control={control}
            name="responsibleId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem responsável</SelectItem>
                  {options.users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="estimatedMinutes">Tempo estimado (min)</Label>
          <Input
            id="estimatedMinutes"
            type="number"
            min={0}
            placeholder="Ex.: 60"
            {...register("estimatedMinutes")}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Departamento</Label>
          <Controller
            control={control}
            name="departmentId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhum</SelectItem>
                  {options.departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Cliente</Label>
          <Controller
            control={control}
            name="clientId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhum</SelectItem>
                  {options.clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {mode === "edit" && (
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => {
            const active = selectedTags.includes(t.id);
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => toggleTag(t.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent",
                )}
              >
                #{t.name}
                {active && <X className="ml-1 inline size-3" />}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Nova tag…"
            className="h-8 w-40"
          />
          <Button type="button" size="sm" variant="outline" onClick={addTag} disabled={addingTag}>
            {addingTag ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Adicionar
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {mode === "create" ? "Criar tarefa" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}

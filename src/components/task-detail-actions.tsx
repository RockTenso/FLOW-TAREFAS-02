"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, MoreHorizontal, Pencil, Ban, Trash2, Loader2 } from "lucide-react";
import type { TaskStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { completeTaskAction, cancelTaskAction, deleteTaskAction } from "@/server/actions";

export function TaskDetailActions({
  taskId,
  status,
}: {
  taskId: string;
  status: TaskStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<null | "cancel" | "delete">(null);

  const finished = status === "COMPLETED" || status === "CANCELLED";

  function complete() {
    startTransition(async () => {
      await completeTaskAction(taskId);
      toast.success("Tarefa concluída.");
      router.refresh();
    });
  }

  function cancel() {
    startTransition(async () => {
      await cancelTaskAction(taskId);
      setDialog(null);
      toast.info("Tarefa cancelada.");
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await deleteTaskAction(taskId);
      setDialog(null);
      toast.success("Tarefa removida.");
      router.push("/tasks");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {!finished && (
        <Button variant="outline" onClick={complete} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          Concluir
        </Button>
      )}

      <Button asChild variant="outline" size="icon" aria-label="Editar tarefa">
        <Link href={`/tasks/${taskId}/edit`}>
          <Pencil className="size-4" />
        </Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Mais ações">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!finished && (
            <DropdownMenuItem onClick={() => setDialog("cancel")}>
              <Ban className="size-4" />
              Cancelar tarefa
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDialog("delete")}>
            <Trash2 className="size-4" />
            Excluir (soft delete)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog === "delete" ? "Excluir tarefa?" : "Cancelar tarefa?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog === "delete"
                ? "A tarefa será removida das listagens (soft delete), mas o histórico e as sessões são preservados para rastreabilidade."
                : "A tarefa será marcada como CANCELADA. O histórico é preservado e ela sai do fluxo ativo."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (dialog === "delete") remove();
                else cancel();
              }}
              disabled={pending}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

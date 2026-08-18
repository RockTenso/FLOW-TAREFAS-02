"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { startTaskAction, pauseTaskAction } from "@/server/actions";

export function PlayButton({
  taskId,
  running,
  labelled = false,
  size = "sm",
}: {
  taskId: string;
  running: boolean;
  labelled?: boolean;
  size?: "sm" | "default" | "lg";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<{ taskCode: string; title: string } | null>(null);

  function start(force: boolean) {
    startTransition(async () => {
      const res = await startTaskAction(taskId, force);
      if (res.ok) {
        setConfirm(null);
        router.refresh();
        toast.success("Execução iniciada.");
      } else if (res.reason === "NEEDS_CONFIRMATION") {
        setConfirm(res.activeTask);
      } else if (res.reason === "ALREADY_RUNNING") {
        router.refresh();
      } else {
        toast.error("Não foi possível iniciar a tarefa.");
      }
    });
  }

  function pause() {
    startTransition(async () => {
      const res = await pauseTaskAction(taskId);
      if (res.ok) {
        router.refresh();
        toast.info("Execução pausada.");
      } else {
        toast.error("Não foi possível pausar a tarefa.");
      }
    });
  }

  return (
    <>
      {running ? (
        <Button
          type="button"
          size={size}
          variant="secondary"
          disabled={pending}
          onClick={pause}
          aria-label="Pausar execução"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Pause className="size-4" />}
          {labelled && "Pausar"}
        </Button>
      ) : (
        <Button
          type="button"
          size={size}
          disabled={pending}
          onClick={() => start(false)}
          aria-label="Iniciar execução"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          {labelled && "Iniciar"}
        </Button>
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Já existe uma tarefa em execução</AlertDialogTitle>
            <AlertDialogDescription>
              Você já está executando a tarefa{" "}
              <span className="font-mono font-medium">{confirm?.taskCode}</span> —{" "}
              {confirm?.title}. Deseja pausá-la e iniciar esta tarefa?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                start(true);
              }}
              disabled={pending}
            >
              Pausar e iniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

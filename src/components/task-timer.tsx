"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/format";

/**
 * Cronômetro cuja fonte de verdade é o banco: recebe o total já consolidado
 * (baseSeconds) e o instante de início da sessão ativa (activeStartedAt).
 * O tempo decorrido é sempre `agora - startedAt`, então atualizar a página (F5)
 * nunca perde o tempo.
 */
export function TaskTimer({
  baseSeconds,
  activeStartedAt,
  running,
  className,
}: {
  baseSeconds: number;
  activeStartedAt: string | null;
  running: boolean;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
    if (running && activeStartedAt) {
      const id = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(id);
    }
  }, [running, activeStartedAt]);

  let seconds = baseSeconds;
  if (mounted && running && activeStartedAt) {
    seconds += Math.max(
      0,
      Math.floor((Date.now() - new Date(activeStartedAt).getTime()) / 1000),
    );
  }

  return (
    <span className={cn("tabular-nums", running && "text-emerald-600 dark:text-emerald-400", className)}>
      {formatClock(seconds)}
    </span>
  );
}

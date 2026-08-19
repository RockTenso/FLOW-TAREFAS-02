export type TimeEntryLike = {
  startedAt: Date | string;
  endedAt: Date | string | null;
  durationSeconds: number | null;
};

/** Segundos de uma sessão. Sessão ativa (sem endedAt) é calculada até `now`. */
export function entrySeconds(entry: TimeEntryLike, now: number = Date.now()): number {
  const start = new Date(entry.startedAt).getTime();
  if (entry.endedAt) {
    if (entry.durationSeconds != null) return entry.durationSeconds;
    return Math.max(0, Math.floor((new Date(entry.endedAt).getTime() - start) / 1000));
  }
  return Math.max(0, Math.floor((now - start) / 1000));
}

/** Tempo total consolidado de uma tarefa (soma das sessões, incluindo a ativa). */
export function totalSeconds(entries: TimeEntryLike[], now: number = Date.now()): number {
  return entries.reduce((acc, e) => acc + entrySeconds(e, now), 0);
}

export function findActiveEntry<T extends { endedAt: Date | string | null }>(
  entries: T[],
): T | undefined {
  return entries.find((e) => !e.endedAt);
}

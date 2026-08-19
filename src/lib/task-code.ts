/** Formata o código amigável da tarefa a partir do valor sequencial: 1 -> "TF-000001". */
export function formatTaskCode(value: number): string {
  return `TF-${String(value).padStart(6, "0")}`;
}

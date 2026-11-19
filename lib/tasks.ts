export type Prioridad = "alta" | "media" | "baja";
export type Estado = "pendiente" | "en_progreso" | "hecha";

export type Task = {
  id: string;
  user_id: string;
  titulo: string;
  descripcion: string | null;
  fecha_limite: string | null;
  prioridad: Prioridad;
  estado: Estado;
  proyecto: string | null;
  created_at: string;
};

export const PRIORIDAD_PESO: Record<Prioridad, number> = { alta: 0, media: 1, baja: 2 };
// Tiempo estimado que requiere una tarea según su prioridad (minutos).
export const MINUTOS_ESTIMADOS: Record<Prioridad, number> = { alta: 90, media: 60, baja: 30 };

export function agrupar(tasks: Task[], hoy: string, en3dias: string) {
  const g = { vencidas: [] as Task[], hoy: [] as Task[], proximos: [] as Task[], despues: [] as Task[] };
  for (const t of tasks) {
    if (t.estado === "hecha") continue;
    if (!t.fecha_limite) g.despues.push(t);
    else if (t.fecha_limite < hoy) g.vencidas.push(t);
    else if (t.fecha_limite === hoy) g.hoy.push(t);
    else if (t.fecha_limite <= en3dias) g.proximos.push(t);
    else g.despues.push(t);
  }
  const ord = (a: Task, b: Task) =>
    PRIORIDAD_PESO[a.prioridad] - PRIORIDAD_PESO[b.prioridad] || (a.fecha_limite ?? "9").localeCompare(b.fecha_limite ?? "9");
  Object.values(g).forEach((l) => l.sort(ord));
  return g;
}

/** La tarea más importante: vencida o de hoy con mayor prioridad. */
export function tareaPrincipal(tasks: Task[], hoy: string): Task | null {
  const candidatas = tasks
    .filter((t) => t.estado !== "hecha" && t.fecha_limite && t.fecha_limite <= hoy)
    .sort((a, b) => PRIORIDAD_PESO[a.prioridad] - PRIORIDAD_PESO[b.prioridad] || a.fecha_limite!.localeCompare(b.fecha_limite!));
  if (candidatas.length) return candidatas[0];
  return [...tasks].filter((t) => t.estado !== "hecha").sort((a, b) => PRIORIDAD_PESO[a.prioridad] - PRIORIDAD_PESO[b.prioridad])[0] ?? null;
}

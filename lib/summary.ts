import type { AgendaDia } from "@/lib/agenda";
import { tareaPrincipal, type Task } from "@/lib/tasks";
import { fmtDuracion } from "@/lib/time";

/** Frase de "hoy en una línea", generada de forma determinista a partir de los datos. */
export function hoyEnUnaLinea(dia: AgendaDia | undefined, tasks: Task[], hoy: string): string {
  const n = dia?.reuniones ?? 0;
  const reuniones = n === 0 ? "ninguna reunión" : n === 1 ? "1 reunión" : `${n} reuniones`;
  const libres = fmtDuracion(dia?.minutosLibres ?? 0);
  const t = tareaPrincipal(tasks, hoy);
  const tarea = t ? ` y lo más importante es «${t.titulo}»` : " y no tienes tareas pendientes";
  return `Hoy tienes ${reuniones}, ${libres} libres${tarea}.`;
}

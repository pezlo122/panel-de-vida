import type { CalEvent } from "@/lib/google/calendar";
import { addDays, dayBounds, ymd, zonedTime } from "@/lib/time";

// Jornada considerada para calcular tiempo libre (hora local).
export const JORNADA = { inicio: 8, fin: 19 };
export const MIN_LIBRE = 45; // minutos
export const MIN_SEPARACION = 15; // minutos

export type AgendaItem =
  | { tipo: "evento"; evento: CalEvent; inicio: number; fin: number; duracionMin: number; conflicto: boolean; separacionCorta: boolean }
  | { tipo: "libre"; inicio: number; fin: number; duracionMin: number };

export type AgendaDia = {
  fecha: string;
  todoElDia: CalEvent[];
  items: AgendaItem[];
  reuniones: number;
  minutosReunion: number;
  minutosLibres: number;
  conflictos: number;
  separacionesCortas: number;
};

const ms = (iso: string) => new Date(iso).getTime();

/** Une intervalos solapados y devuelve los minutos totales cubiertos. */
export function unionMinutes(intervals: [number, number][]): number {
  const s = [...intervals].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let cur: [number, number] | null = null;
  for (const [a, b] of s) {
    if (!cur || a > cur[1]) {
      if (cur) total += cur[1] - cur[0];
      cur = [a, b];
    } else cur[1] = Math.max(cur[1], b);
  }
  if (cur) total += cur[1] - cur[0];
  return total / 60000;
}

export function buildDay(fecha: string, allEvents: CalEvent[], tz: string, now = new Date()): AgendaDia {
  const { start, end } = dayBounds(fecha, tz);
  const todoElDia = allEvents.filter((e) => {
    if (!e.todoElDia) return false;
    const d0 = e.inicio.slice(0, 10);
    const d1 = e.fin.slice(0, 10);
    return d0 <= fecha && fecha < d1;
  });
  const timed = allEvents
    .filter((e) => !e.todoElDia && ms(e.fin) > start.getTime() && ms(e.inicio) < end.getTime())
    .sort((a, b) => ms(a.inicio) - ms(b.inicio));

  const eventItems = timed.map((e) => ({
    tipo: "evento" as const,
    evento: e,
    inicio: Math.max(ms(e.inicio), start.getTime()),
    fin: Math.min(ms(e.fin), end.getTime()),
    duracionMin: (ms(e.fin) - ms(e.inicio)) / 60000,
    conflicto: false,
    separacionCorta: false,
  }));

  for (let i = 0; i < eventItems.length; i++) {
    for (let j = i + 1; j < eventItems.length; j++) {
      const a = eventItems[i];
      const b = eventItems[j];
      if (b.inicio < a.fin) {
        a.conflicto = b.conflicto = true;
      }
    }
  }
  // Separación corta: el siguiente evento empieza entre 0 y 15 min después de que termina el anterior.
  let maxFin = -Infinity;
  for (let i = 0; i < eventItems.length; i++) {
    const e = eventItems[i];
    if (i > 0 && !e.conflicto) {
      const gap = (e.inicio - maxFin) / 60000;
      if (gap >= 0 && gap < MIN_SEPARACION) e.separacionCorta = true;
    }
    maxFin = Math.max(maxFin, e.fin);
  }

  // Bloques libres dentro de la jornada (desde "ahora" si es hoy).
  const jIni = Math.max(zonedTime(fecha, JORNADA.inicio, 0, tz).getTime(), fecha === ymd(now, tz) ? now.getTime() : 0);
  const jFin = zonedTime(fecha, JORNADA.fin, 0, tz).getTime();
  const libres: AgendaItem[] = [];
  let cursor = jIni;
  for (const e of eventItems) {
    if (e.inicio > cursor && e.inicio <= jFin) pushLibre(cursor, e.inicio);
    cursor = Math.max(cursor, e.fin);
  }
  if (jFin > cursor) pushLibre(cursor, jFin);
  function pushLibre(a: number, b: number) {
    const d = (b - a) / 60000;
    if (d > MIN_LIBRE) libres.push({ tipo: "libre", inicio: a, fin: b, duracionMin: d });
  }

  const items = [...eventItems, ...libres].sort((a, b) => a.inicio - b.inicio);
  return {
    fecha,
    todoElDia,
    items,
    reuniones: eventItems.length,
    minutosReunion: unionMinutes(eventItems.map((e) => [e.inicio, e.fin])),
    minutosLibres: libres.reduce((s, l) => s + l.duracionMin, 0),
    conflictos: eventItems.filter((e) => e.conflicto).length,
    separacionesCortas: eventItems.filter((e) => e.separacionCorta).length,
  };
}

export function buildWeek(hoy: string, events: CalEvent[], tz: string, dias = 7, now = new Date()): AgendaDia[] {
  return Array.from({ length: dias }, (_, i) => buildDay(addDays(hoy, i), events, tz, now));
}

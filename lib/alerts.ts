import type { AgendaDia } from "@/lib/agenda";
import type { EmailItem } from "@/lib/emails";
import type { CalEvent } from "@/lib/google/calendar";
import { MINUTOS_ESTIMADOS, type Task } from "@/lib/tasks";
import { addDays, fmtDia, fmtDuracion, tzOffsetMinutes } from "@/lib/time";

export type Alerta = {
  tipo: "correo_sin_evento" | "reunion_sin_detalles" | "tareas_sin_tiempo" | "dia_sobrecargado";
  mensaje: string;
  url?: string;
};

const STOP = new Set(["para", "sobre", "reunión", "reunion", "meeting", "llamada", "con", "the", "and", "invitación", "invitation", "re:", "fwd:", "rv:"]);
const palabras = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !STOP.has(w)),
  );
const comparten = (a: string, b: string) => {
  const pb = palabras(b);
  return [...palabras(a)].some((w) => pb.has(w));
};

/** Fecha local (YYYY-MM-DD) y minutos del día de un evento. */
function local(iso: string, tz: string) {
  const d = new Date(iso);
  const l = new Date(d.getTime() + tzOffsetMinutes(d, tz) * 60000);
  return { fecha: l.toISOString().slice(0, 10), min: l.getUTCHours() * 60 + l.getUTCMinutes() };
}

export function computeAlerts(args: {
  hoy: string;
  tz: string;
  dias: AgendaDia[];
  events: CalEvent[];
  emails: EmailItem[];
  tasks: Task[];
}): Alerta[] {
  const { hoy, tz, dias, events, emails, tasks } = args;
  const alertas: Alerta[] = [];
  const limite = addDays(hoy, 6); // ventana con datos de calendario

  // 1. Correos con fecha o reunión que no aparece en el calendario.
  for (const e of emails) {
    if (e.categoria === "informativo" || !e.fechaLimite) continue;
    if (e.fechaLimite < hoy || e.fechaLimite > limite) continue;
    const delDia = events.filter((ev) => (ev.todoElDia ? ev.inicio.slice(0, 10) === e.fechaLimite : local(ev.inicio, tz).fecha === e.fechaLimite));
    let cubierto = delDia.some((ev) => comparten(ev.titulo, e.asunto) || comparten(ev.titulo, e.resumen));
    if (!cubierto && e.esReunion && e.horaDetectada) {
      const [h, m] = e.horaDetectada.split(":").map(Number);
      cubierto = delDia.some((ev) => !ev.todoElDia && Math.abs(local(ev.inicio, tz).min - (h * 60 + m)) <= 30);
    }
    if (!cubierto && !e.esReunion) {
      cubierto = tasks.some((t) => t.fecha_limite === e.fechaLimite && (comparten(t.titulo, e.asunto) || comparten(t.titulo, e.resumen)));
    }
    if (!cubierto) {
      const que = e.esReunion ? "una reunión" : "una fecha límite";
      alertas.push({
        tipo: "correo_sin_evento",
        mensaje: `«${e.asunto}» menciona ${que} el ${fmtDia(e.fechaLimite, { weekday: "long", day: "numeric" })}${e.horaDetectada ? ` a las ${e.horaDetectada}` : ""} que no está en tu calendario.`,
        url: e.url,
      });
    }
  }

  // 2. Reuniones de hoy sin enlace ni descripción.
  const hoyDia = dias.find((d) => d.fecha === hoy);
  for (const it of hoyDia?.items ?? []) {
    if (it.tipo !== "evento") continue;
    const ev = it.evento;
    if (ev.asistentes > 1 && !ev.enlaceVideo && !ev.descripcion && !ev.ubicacion) {
      alertas.push({ tipo: "reunion_sin_detalles", mensaje: `La reunión «${ev.titulo}» de hoy no tiene enlace, lugar ni descripción.`, url: ev.htmlLink });
    }
  }

  // 3. Tareas que vencen hoy sin tiempo libre suficiente.
  const deHoy = tasks.filter((t) => t.estado !== "hecha" && t.fecha_limite === hoy);
  if (deHoy.length && hoyDia) {
    const requerido = deHoy.reduce((s, t) => s + MINUTOS_ESTIMADOS[t.prioridad], 0);
    if (hoyDia.minutosLibres < requerido) {
      alertas.push({
        tipo: "tareas_sin_tiempo",
        mensaje: `${deHoy.length} tarea${deHoy.length > 1 ? "s vencen" : " vence"} hoy (≈${fmtDuracion(requerido)}) y solo quedan ${fmtDuracion(hoyDia.minutosLibres)} en bloques libres.`,
      });
    }
  }

  // 4. Días con más de 6 horas de reuniones.
  for (const d of dias) {
    if (d.minutosReunion > 360) {
      alertas.push({
        tipo: "dia_sobrecargado",
        mensaje: `${d.fecha === hoy ? "Hoy" : fmtDia(d.fecha, { weekday: "long", day: "numeric" })} tiene ${fmtDuracion(d.minutosReunion)} de reuniones.`,
      });
    }
  }
  return alertas;
}

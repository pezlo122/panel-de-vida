"use server";
import { z } from "zod";
import { getApiUser } from "@/lib/auth";
import { claudeJSON } from "@/lib/anthropic";
import { env } from "@/lib/env";
import { ymd } from "@/lib/time";
import type { Task } from "@/lib/tasks";

const TaskInput = z.object({
  titulo: z.string().trim().min(1).max(300),
  descripcion: z.string().trim().max(5000).nullable().optional(),
  fecha_limite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  prioridad: z.enum(["alta", "media", "baja"]).default("media"),
  estado: z.enum(["pendiente", "en_progreso", "hecha"]).default("pendiente"),
  proyecto: z.string().trim().max(100).nullable().optional(),
});
export type TaskInput = z.input<typeof TaskInput>;

async function auth() {
  const a = await getApiUser();
  if (!a) throw new Error("No autorizado");
  return a;
}

const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

export async function createTask(input: TaskInput): Promise<Task> {
  const { supabase, user } = await auth();
  const t = TaskInput.parse(input);
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...t, descripcion: clean(t.descripcion), proyecto: clean(t.proyecto), fecha_limite: t.fecha_limite ?? null, user_id: user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Task;
}

export async function updateTask(id: string, input: Partial<TaskInput>): Promise<Task> {
  const { supabase, user } = await auth();
  const t = TaskInput.partial().parse(input);
  const patch: Record<string, unknown> = { ...t };
  if ("descripcion" in t) patch.descripcion = clean(t.descripcion);
  if ("proyecto" in t) patch.proyecto = clean(t.proyecto);
  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", z.uuid().parse(id))
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Task;
}

export async function deleteTask(id: string): Promise<void> {
  const { supabase, user } = await auth();
  const { error } = await supabase.from("tasks").delete().eq("id", z.uuid().parse(id)).eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

const Parsed = z.object({
  titulo: z.string(),
  fecha_limite: z.string().nullable(),
  prioridad: z.enum(["alta", "media", "baja"]),
  proyecto: z.string().nullable(),
});

/** "pagar luz el viernes" → tarea con fecha, interpretada por Claude. */
export async function createTaskFromText(texto: string): Promise<Task> {
  await auth();
  const linea = z.string().trim().min(1).max(500).parse(texto);
  const tz = env.timezone();
  const now = new Date();
  const hoy = ymd(now, tz);
  const diaSemana = new Intl.DateTimeFormat("es-CO", { weekday: "long", timeZone: tz }).format(now);
  const p = await claudeJSON({
    system: `Conviertes una línea en español en una tarea. Devuelve:
- titulo: la acción, breve, sin la fecha ni palabras de prioridad, empezando con mayúscula.
- fecha_limite: YYYY-MM-DD resolviendo expresiones relativas ("mañana", "el viernes" = el próximo viernes, o hoy si hoy es viernes; "fin de mes"); null si no hay fecha.
- prioridad: "alta" si dice urgente/importante/!; "baja" si dice cuando pueda/algún día; si no, "media".
- proyecto: si la línea incluye #etiqueta o "para el proyecto X", ese nombre; si no, null.`,
    user: `Hoy es ${diaSemana} ${hoy}.\nLínea: ${linea}`,
    schema: Parsed,
    effort: "low",
    maxTokens: 1000,
  });
  const fecha = p.fecha_limite && /^\d{4}-\d{2}-\d{2}$/.test(p.fecha_limite) ? p.fecha_limite : null;
  return createTask({ titulo: p.titulo || linea, fecha_limite: fecha, prioridad: p.prioridad, proyecto: p.proyecto });
}

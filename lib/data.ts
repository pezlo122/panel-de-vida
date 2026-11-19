import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { fetchEvents } from "@/lib/google/calendar";
import { buildWeek } from "@/lib/agenda";
import { getEmails } from "@/lib/emails";
import type { Task } from "@/lib/tasks";
import { computeAlerts } from "@/lib/alerts";
import { addDays, dayBounds, ymd } from "@/lib/time";

// Cargadores compartidos por las secciones del panel (deduplicados por request).

export const getContext = cache(async () => {
  const { supabase, user } = await requireUser();
  const tz = env.timezone();
  const now = new Date();
  return { supabase, user, tz, now, hoy: ymd(now, tz) };
});

export const getAgenda = cache(async () => {
  const { supabase, user, tz, now, hoy } = await getContext();
  const { start } = dayBounds(hoy, tz);
  const { start: end } = dayBounds(addDays(hoy, 7), tz);
  const { events, errors } = await fetchEvents(supabase, user.id, start, end);
  return { events, errors, dias: buildWeek(hoy, events, tz, 7, now) };
});

export const getEmailData = cache(async () => {
  const { supabase, user, now } = await getContext();
  return getEmails(supabase, user.id, now);
});

export const getTasks = cache(async () => {
  const { supabase, user } = await getContext();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .neq("estado", "hecha")
    .order("fecha_limite", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Task[];
});

export const getAlerts = cache(async () => {
  const { hoy, tz } = await getContext();
  const [agenda, emails, tasks] = await Promise.all([getAgenda(), getEmailData(), getTasks()]);
  return computeAlerts({ hoy, tz, dias: agenda.dias, events: agenda.events, emails: emails.items, tasks });
});

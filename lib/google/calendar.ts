import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getGoogleAccounts, googleGet, markSynced } from "@/lib/google/oauth";

export type CalEvent = {
  id: string;
  cuenta: string;
  calendario: string;
  titulo: string;
  inicio: string; // ISO
  fin: string; // ISO
  todoElDia: boolean;
  enlaceVideo: string | null;
  descripcion: string | null;
  ubicacion: string | null;
  htmlLink: string;
  asistentes: number;
};

type GEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink: string;
  hangoutLink?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
  conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
  eventType?: string;
};

const VIDEO_RE = /https?:\/\/[^\s<>"]*(zoom\.us|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|webex\.com)[^\s<>"]*/i;

function videoLink(e: GEvent): string | null {
  if (e.hangoutLink) return e.hangoutLink;
  const ep = e.conferenceData?.entryPoints?.find((x) => x.entryPointType === "video");
  if (ep) return ep.uri;
  return e.location?.match(VIDEO_RE)?.[0] ?? e.description?.match(VIDEO_RE)?.[0] ?? null;
}

/** Lee (solo lectura) los eventos de todas las cuentas y calendarios visibles. */
export async function fetchEvents(
  supabase: SupabaseClient,
  userId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<{ events: CalEvent[]; errors: string[] }> {
  const { accounts, errors: accErrors } = await getGoogleAccounts(supabase, userId);
  const errors = accErrors.map((e) => `${e.cuentaEmail}: ${e.error}`);
  const events: CalEvent[] = [];

  await Promise.all(
    accounts.map(async (acc) => {
      try {
        const list = await googleGet<{ items: { id: string; summary: string; selected?: boolean; primary?: boolean }[] }>(
          acc.accessToken,
          "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader",
        );
        const cals = list.items.filter((c) => c.primary || c.selected);
        await Promise.all(
          cals.map(async (cal) => {
            const p = new URLSearchParams({
              timeMin: timeMin.toISOString(),
              timeMax: timeMax.toISOString(),
              singleEvents: "true",
              orderBy: "startTime",
              maxResults: "250",
            });
            const res = await googleGet<{ items: GEvent[] }>(
              acc.accessToken,
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${p}`,
            );
            for (const e of res.items ?? []) {
              if (e.status === "cancelled") continue;
              if (e.eventType === "workingLocation" || e.eventType === "birthday") continue;
              if (e.attendees?.find((a) => a.self)?.responseStatus === "declined") continue;
              const todoElDia = !e.start.dateTime;
              events.push({
                id: `${acc.cuentaEmail}:${e.id}`,
                cuenta: acc.cuentaEmail,
                calendario: cal.summary,
                titulo: e.summary || "(sin título)",
                inicio: e.start.dateTime ?? `${e.start.date}T00:00:00`,
                fin: e.end.dateTime ?? `${e.end.date}T00:00:00`,
                todoElDia,
                enlaceVideo: videoLink(e),
                descripcion: e.description?.trim() || null,
                ubicacion: e.location || null,
                htmlLink: e.htmlLink,
                asistentes: e.attendees?.length ?? 0,
              });
            }
          }),
        );
        await markSynced(supabase, acc.id);
      } catch (e) {
        errors.push(`${acc.cuentaEmail}: ${e instanceof Error ? e.message : e}`);
      }
    }),
  );

  // Un mismo evento puede aparecer en ambas cuentas (invitación cruzada): deduplicar.
  const seen = new Set<string>();
  const unique = events
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .filter((e) => {
      const k = `${e.titulo}|${e.inicio}|${e.fin}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  return { events: unique, errors };
}

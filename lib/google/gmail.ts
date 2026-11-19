import "server-only";
import { googleGet } from "@/lib/google/oauth";

export type GmailThread = {
  threadId: string;
  cuenta: string;
  ultimoMensajeId: string;
  asunto: string;
  remitente: string; // "Nombre <correo>" del último mensaje recibido
  remitenteEmail: string;
  fragmento: string;
  ultimoMensajeAt: string;
  ultimoEsMio: boolean;
  noLeido: boolean;
};

type GMsg = {
  id: string;
  internalDate: string;
  labelIds?: string[];
  snippet: string;
  payload: { headers: { name: string; value: string }[] };
};

const header = (m: GMsg, n: string) =>
  m.payload.headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value ?? "";

export const emailOf = (from: string) => (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();

const decode = (s: string) =>
  s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

async function listThreadIds(token: string, q: string, max = 30): Promise<string[]> {
  const p = new URLSearchParams({ q, maxResults: String(max) });
  const r = await googleGet<{ threads?: { id: string }[] }>(
    token,
    `https://gmail.googleapis.com/gmail/v1/users/me/threads?${p}`,
  );
  return (r.threads ?? []).map((t) => t.id);
}

async function getThread(token: string, id: string, cuenta: string): Promise<GmailThread | null> {
  const p = new URLSearchParams({ format: "metadata" });
  ["From", "Subject", "Date"].forEach((h) => p.append("metadataHeaders", h));
  const t = await googleGet<{ id: string; messages: GMsg[] }>(
    token,
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${id}?${p}`,
  );
  const msgs = (t.messages ?? []).filter((m) => !m.labelIds?.includes("DRAFT"));
  if (!msgs.length) return null;
  const last = msgs[msgs.length - 1];
  const ultimoEsMio = !!last.labelIds?.includes("SENT");
  const ultimoRecibido = [...msgs].reverse().find((m) => !m.labelIds?.includes("SENT")) ?? last;
  const from = header(ultimoRecibido, "From");
  return {
    threadId: t.id,
    cuenta,
    ultimoMensajeId: last.id,
    asunto: header(msgs[0], "Subject") || "(sin asunto)",
    remitente: from,
    remitenteEmail: emailOf(from),
    fragmento: decode(last.snippet ?? "").slice(0, 400),
    ultimoMensajeAt: new Date(Number(last.internalDate)).toISOString(),
    ultimoEsMio,
    noLeido: msgs.some((m) => m.labelIds?.includes("UNREAD")),
  };
}

/**
 * Hilos relevantes de una cuenta (solo lectura):
 *  - recibidos en las últimas 48 h que están sin leer o sin respuesta,
 *  - de remitentes prioritarios (últimos 7 días),
 *  - enviados por mí hace más de 3 días sin respuesta (últimos 14 días).
 */
export async function fetchRelevantThreads(token: string, cuenta: string, prioritarios: string[]) {
  const queries = [
    "newer_than:2d -in:chats -in:spam -in:trash -from:me",
    "in:sent newer_than:14d older_than:3d",
  ];
  if (prioritarios.length) queries.push(`from:(${prioritarios.join(" OR ")}) newer_than:7d -in:spam -in:trash`);

  const ids = [...new Set((await Promise.all(queries.map((q) => listThreadIds(token, q)))).flat())];
  const threads: GmailThread[] = [];
  // Concurrencia limitada para no exceder la cuota de Gmail.
  for (let i = 0; i < ids.length; i += 10) {
    const batch = await Promise.all(ids.slice(i, i + 10).map((id) => getThread(token, id, cuenta).catch(() => null)));
    threads.push(...batch.filter((t): t is GmailThread => !!t));
  }
  return threads;
}

export const gmailThreadUrl = (cuenta: string, threadId: string) =>
  `https://mail.google.com/mail/?authuser=${encodeURIComponent(cuenta)}#all/${threadId}`;

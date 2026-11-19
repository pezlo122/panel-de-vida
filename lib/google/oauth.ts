import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { decrypt, encrypt } from "@/lib/crypto";

// SOLO lectura. La app nunca pide scopes de escritura.
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
];

export const redirectUri = () => `${env.appUrl()}/api/google/callback`;

export function buildAuthUrl(state: string, loginHint?: string) {
  const p = new URLSearchParams({
    client_id: env.googleClientId(),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent select_account",
    include_granted_scopes: "true",
    state,
  });
  if (loginHint) p.set("login_hint", loginHint);
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope: string;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.googleClientId(),
      client_secret: env.googleClientSecret(),
      ...body,
    }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(`Google token error: ${json.error ?? res.status} ${json.error_description ?? ""}`);
    (err as Error & { code?: string }).code = json.error;
    throw err;
  }
  return json;
}

export function exchangeCode(code: string) {
  return tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
}

export function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString());
    return (payload.email as string)?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export type GoogleAccount = { id: string; cuentaEmail: string; accessToken: string };

// Caché en memoria por instancia: evita renovar en cada llamada.
const cache = new Map<string, { token: string; exp: number }>();

/**
 * Devuelve un access token válido para cada cuenta Google conectada.
 * Renueva automáticamente con el refresh token (descifrado) antes de cada uso
 * si el token en caché vence en menos de 60 s.
 */
export async function getGoogleAccounts(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ accounts: GoogleAccount[]; errors: { cuentaEmail: string; error: string }[] }> {
  const { data, error } = await supabase
    .from("integrations")
    .select("id, cuenta_email, refresh_token_cifrado")
    .eq("user_id", userId)
    .eq("proveedor", "google");
  if (error) throw error;

  const accounts: GoogleAccount[] = [];
  const errors: { cuentaEmail: string; error: string }[] = [];
  await Promise.all(
    (data ?? []).map(async (row) => {
      try {
        const cached = cache.get(row.id);
        let token = cached && cached.exp - Date.now() > 60_000 ? cached.token : null;
        if (!token) {
          const t = await tokenRequest({
            grant_type: "refresh_token",
            refresh_token: decrypt(row.refresh_token_cifrado),
          });
          token = t.access_token;
          cache.set(row.id, { token, exp: Date.now() + t.expires_in * 1000 });
          if (t.refresh_token) {
            await supabase
              .from("integrations")
              .update({ refresh_token_cifrado: encrypt(t.refresh_token) })
              .eq("id", row.id);
          }
        }
        accounts.push({ id: row.id, cuentaEmail: row.cuenta_email, accessToken: token });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push({ cuentaEmail: row.cuenta_email, error: msg });
        await supabase.from("integrations").update({ ultimo_error: msg }).eq("id", row.id);
      }
    }),
  );
  accounts.sort((a, b) => a.cuentaEmail.localeCompare(b.cuentaEmail));
  return { accounts, errors };
}

export async function markSynced(supabase: SupabaseClient, integrationId: string) {
  await supabase
    .from("integrations")
    .update({ ultima_sincronizacion: new Date().toISOString(), ultimo_error: null })
    .eq("id", integrationId);
}

/** GET de solo lectura a una API de Google. */
export async function googleGet<T>(accessToken: string, url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json() as Promise<T>;
}

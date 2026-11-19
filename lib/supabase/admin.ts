import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Cliente con service role: ignora RLS. Úsalo SOLO en el servidor (cron) y
// filtra siempre por el user_id del usuario permitido.
export function createAdminClient() {
  return createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getOwnerUserId(): Promise<string> {
  const admin = createAdminClient();
  const target = env.allowedEmail();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === target);
    if (u) return u.id;
    if (data.users.length < 100) break;
  }
  throw new Error("El usuario permitido aún no ha iniciado sesión en la app");
}

import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/env";

/** Devuelve el usuario autenticado y permitido, o redirige. */
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  if (!isAllowedEmail(data.user.email)) redirect("/acceso-denegado");
  return { supabase, user: data.user };
}

/** Variante para route handlers: devuelve null en vez de redirigir. */
export async function getApiUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user || !isAllowedEmail(data.user.email)) return null;
  return { supabase, user: data.user };
}

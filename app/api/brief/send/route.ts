import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { runDailyBrief } from "@/lib/brief";

export const maxDuration = 120;

// Botón "Enviar resumen ahora": usa la sesión del usuario (RLS activo).
export async function POST() {
  const auth = await getApiUser();
  if (!auth) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  try {
    const res = await runDailyBrief(auth.supabase, auth.user.id, { force: true });
    return NextResponse.json({ status: res.status, fecha: res.fecha });
  } catch (e) {
    console.error("brief/send", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}

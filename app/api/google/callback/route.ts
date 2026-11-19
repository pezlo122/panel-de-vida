import { urlFor } from "@/lib/origin";
import { NextResponse, type NextRequest } from "next/server";
import { getApiUser } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { emailFromIdToken, exchangeCode } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const home = (q: string) => NextResponse.redirect(urlFor(request, `/?google=${q}`));

  const auth = await getApiUser();
  if (!auth) return NextResponse.redirect(urlFor(request, "/login"));

  const state = url.searchParams.get("state");
  if (!state || state !== request.cookies.get("g_oauth_state")?.value) return home("estado_invalido");
  if (url.searchParams.get("error")) return home("cancelado");
  const code = url.searchParams.get("code");
  if (!code) return home("sin_codigo");

  try {
    const tokens = await exchangeCode(code);
    const cuentaEmail = emailFromIdToken(tokens.id_token);
    if (!cuentaEmail) return home("sin_email");
    if (!tokens.refresh_token) return home("sin_refresh_token");
    const scopes = tokens.scope.split(" ");
    if (!scopes.some((s) => s.endsWith("calendar.readonly")) || !scopes.some((s) => s.endsWith("gmail.readonly"))) {
      return home("permisos_incompletos");
    }

    const { error } = await auth.supabase.from("integrations").upsert(
      {
        user_id: auth.user.id,
        proveedor: "google",
        cuenta_email: cuentaEmail,
        refresh_token_cifrado: encrypt(tokens.refresh_token),
        ultima_sincronizacion: new Date().toISOString(),
        ultimo_error: null,
      },
      { onConflict: "user_id,proveedor,cuenta_email" },
    );
    if (error) throw error;
  } catch (e) {
    console.error("google callback", e);
    return home("error");
  }
  const res = home("conectado");
  res.cookies.delete({ name: "g_oauth_state", path: "/api/google" });
  return res;
}

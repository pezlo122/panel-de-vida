import { urlFor } from "@/lib/origin";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/configuracion", "/login", "/acceso-denegado", "/auth/callback", "/api/cron"];

export async function proxy(request: NextRequest) {
  // Sin Supabase configurado, mostrar qué variables faltan en vez de fallar.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.ALLOWED_EMAIL) {
    if (request.nextUrl.pathname.startsWith("/configuracion")) return NextResponse.next();
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "configuración pendiente" }, { status: 503 });
    }
    return NextResponse.redirect(urlFor(request, "/configuracion"));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (PUBLIC.some((p) => path.startsWith(p))) return response;

  const isApi = path.startsWith("/api/");
  if (!data.user) {
    if (isApi) return NextResponse.json({ error: "no autenticado" }, { status: 401 });
    return NextResponse.redirect(urlFor(request, "/login"));
  }
  const allowed = (process.env.ALLOWED_EMAIL || "").trim().toLowerCase();
  if (data.user.email?.toLowerCase() !== allowed) {
    if (isApi) return NextResponse.json({ error: "acceso denegado" }, { status: 403 });
    return NextResponse.redirect(urlFor(request, "/acceso-denegado"));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};

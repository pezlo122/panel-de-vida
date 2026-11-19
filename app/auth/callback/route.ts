import { urlFor } from "@/lib/origin";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/env";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(urlFor(request, "/login?error=sin_codigo"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(urlFor(request, "/login?error=auth"));
  }
  if (!isAllowedEmail(data.user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(urlFor(request, "/acceso-denegado"));
  }
  return NextResponse.redirect(urlFor(request, "/"));
}

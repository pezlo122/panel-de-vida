import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getApiUser } from "@/lib/auth";
import { buildAuthUrl } from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  const auth = await getApiUser();
  if (!auth) return NextResponse.redirect(new URL("/login", request.url));
  const state = randomBytes(24).toString("base64url");
  const hint = request.nextUrl.searchParams.get("cuenta") ?? undefined;
  const res = NextResponse.redirect(buildAuthUrl(state, hint));
  res.cookies.set("g_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/google",
  });
  return res;
}

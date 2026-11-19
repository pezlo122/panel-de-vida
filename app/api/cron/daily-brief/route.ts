import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, getOwnerUserId } from "@/lib/supabase/admin";
import { runDailyBrief } from "@/lib/brief";

export const maxDuration = 120;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

// Vercel Cron llama con GET y envía "Authorization: Bearer $CRON_SECRET".
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  try {
    const admin = createAdminClient();
    const userId = await getOwnerUserId();
    const res = await runDailyBrief(admin, userId);
    return NextResponse.json({ status: res.status, fecha: res.fecha });
  } catch (e) {
    console.error("daily-brief", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}

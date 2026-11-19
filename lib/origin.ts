import type { NextRequest } from "next/server";

/** Origen público real (respeta proxies como Codespaces o Vercel). */
export function publicOrigin(request: NextRequest | Request): string {
  const h = request.headers;
  const host = h.get("x-forwarded-host")?.split(",")[0].trim();
  if (host) {
    const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() || "https";
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}

export const urlFor = (request: NextRequest | Request, path: string) => new URL(path, publicOrigin(request));

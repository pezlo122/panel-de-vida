import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

// AES-256-GCM. Formato: v1.<iv>.<tag>.<ciphertext> (base64url)
function key(): Buffer {
  const k = Buffer.from(env.tokenEncryptionKey(), "base64");
  if (k.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY debe ser de 32 bytes en base64");
  return k;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv, c.getAuthTag(), enc].map((x) => (typeof x === "string" ? x : x.toString("base64url"))).join(".");
}

export function decrypt(payload: string): string {
  const [v, iv, tag, enc] = payload.split(".");
  if (v !== "v1") throw new Error("Formato de token cifrado desconocido");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(enc, "base64url")), d.final()]).toString("utf8");
}

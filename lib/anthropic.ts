import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { env } from "@/lib/env";

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic({ apiKey: env.anthropicApiKey() });
  return client;
}

// Modelos que aceptan `fallbacks: "default"` (reintento en otro modelo si hay un rechazo).
const FALLBACK_MODELS = new Set(["claude-sonnet-5-5", "claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-fable-5-2"]);

/** Llama a Claude y devuelve un objeto validado contra el esquema Zod. */
export async function claudeJSON<S extends z.ZodType>(opts: {
  system: string;
  user: string;
  schema: S;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const model = env.anthropicModel();
  const useFallback = FALLBACK_MODELS.has(model);
  const res = await getClient().beta.messages.parse({
    model,
    max_tokens: opts.maxTokens ?? 8000,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
    output_config: { format: betaZodOutputFormat(opts.schema), effort: opts.effort ?? "low" },
    ...(useFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
  });
  if (res.stop_reason === "refusal") throw new Error("Claude rechazó la solicitud");
  if (res.stop_reason === "max_tokens") throw new Error("Respuesta de Claude truncada (max_tokens)");
  if (!res.parsed_output) throw new Error("Claude no devolvió JSON válido");
  return res.parsed_output as z.infer<S>;
}

/** Texto libre (Markdown) — usado para el resumen matutino. */
export async function claudeText(opts: { system: string; user: string; effort?: "low" | "medium" | "high"; maxTokens?: number }) {
  const model = env.anthropicModel();
  const useFallback = FALLBACK_MODELS.has(model);
  const res = await getClient().beta.messages.create({
    model,
    max_tokens: opts.maxTokens ?? 8000,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
    output_config: { effort: opts.effort ?? "medium" },
    ...(useFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
  });
  if (res.stop_reason === "refusal") throw new Error("Claude rechazó la solicitud");
  return res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
}

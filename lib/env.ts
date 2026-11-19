// Lectura centralizada de variables de entorno (solo servidor).
function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name}`);
  return v;
}

export const env = {
  supabaseUrl: () => req("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => req("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => req("SUPABASE_SERVICE_ROLE_KEY"),
  allowedEmail: () => req("ALLOWED_EMAIL").trim().toLowerCase(),
  googleClientId: () => req("GOOGLE_CLIENT_ID"),
  googleClientSecret: () => req("GOOGLE_CLIENT_SECRET"),
  tokenEncryptionKey: () => req("TOKEN_ENCRYPTION_KEY"),
  anthropicApiKey: () => req("ANTHROPIC_API_KEY"),
  anthropicModel: () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
  resendApiKey: () => req("RESEND_API_KEY"),
  resendFrom: () => process.env.RESEND_FROM || "Panel de Vida <onboarding@resend.dev>",
  briefToEmail: () => process.env.BRIEF_TO_EMAIL || req("ALLOWED_EMAIL"),
  cronSecret: () => req("CRON_SECRET"),
  timezone: () => process.env.APP_TIMEZONE || "America/Bogota",
  prioritySenders: () =>
    (process.env.PRIORITY_SENDERS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  appUrl: () => (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, ""),
};

export function isAllowedEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === env.allowedEmail();
}

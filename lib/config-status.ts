// Variables necesarias por funcionalidad (para la pantalla de configuración).
export const REQUIRED = {
  "Login (Supabase)": ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "ALLOWED_EMAIL"],
  "Agenda y correos (Google)": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY"],
  "Clasificación y tareas en lenguaje natural": ["ANTHROPIC_API_KEY"],
  "Resumen matutino": ["RESEND_API_KEY", "CRON_SECRET", "SUPABASE_SERVICE_ROLE_KEY"],
} as const;

export function missingVars(): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(REQUIRED).map(([k, vars]) => [k, vars.filter((v) => !process.env[v])]),
  );
}

export const supabaseConfigured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !!process.env.ALLOWED_EMAIL;

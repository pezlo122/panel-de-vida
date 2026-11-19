import { Button } from "@/components/ui/button";
import { getContext } from "@/lib/data";
import { Empty, Section } from "./section";

function fmt(ts: string | null, tz: string) {
  if (!ts) return "nunca";
  return new Intl.DateTimeFormat("es-CO", { timeZone: tz, dateStyle: "medium", timeStyle: "short" }).format(new Date(ts));
}

export async function Conexiones() {
  const { supabase, user, tz } = await getContext();
  const { data } = await supabase
    .from("integrations")
    .select("id, proveedor, cuenta_email, ultima_sincronizacion, ultimo_error")
    .eq("user_id", user.id)
    .order("cuenta_email");

  const servicios = [
    { nombre: "Anthropic (clasificación y resumen)", ok: !!process.env.ANTHROPIC_API_KEY },
    { nombre: "Resend (envío del resumen)", ok: !!process.env.RESEND_API_KEY },
  ];

  return (
    <Section
      title="Estado de conexiones"
      action={
        <Button asChild size="sm" variant="outline">
          <a href="/api/google/connect">Conectar cuenta de Google</a>
        </Button>
      }
    >
      <ul className="divide-y text-sm">
        {(data ?? []).length === 0 && (
          <li className="py-2">
            <Empty>Conecta tu cuenta personal y la universitaria para ver agenda y correos.</Empty>
          </li>
        )}
        {(data ?? []).map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="truncate font-medium">Google · {i.cuenta_email}</p>
              <p className="text-xs text-muted-foreground">
                {i.ultimo_error ? `Error: ${i.ultimo_error.slice(0, 120)}` : `Última sincronización: ${fmt(i.ultima_sincronizacion, tz)}`}
              </p>
            </div>
            <Button asChild size="sm" variant={i.ultimo_error ? "default" : "ghost"}>
              <a href={`/api/google/connect?cuenta=${encodeURIComponent(i.cuenta_email)}`}>Reconectar</a>
            </Button>
          </li>
        ))}
        {servicios.map((s) => (
          <li key={s.nombre} className="flex items-center justify-between gap-2 py-2">
            <p>{s.nombre}</p>
            <span className="text-xs text-muted-foreground">{s.ok ? "Configurado" : "Falta la llave"}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

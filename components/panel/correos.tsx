import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getContext, getEmailData } from "@/lib/data";
import type { EmailItem } from "@/lib/emails";
import { fmtDia } from "@/lib/time";
import { Empty, Section } from "./section";

function nombre(from: string) {
  return from.replace(/<[^>]+>/, "").replace(/"/g, "").trim() || from;
}

function Tarjeta({ e, tz }: { e: EmailItem; tz: string }) {
  const cuando = new Intl.DateTimeFormat("es-CO", { timeZone: tz, weekday: "short", hour: "numeric", minute: "2-digit" }).format(
    new Date(e.ultimoMensajeAt),
  );
  return (
    <li>
      <a
        href={e.url}
        target="_blank"
        rel="noreferrer"
        className="block rounded-md border px-3 py-2 transition-colors hover:bg-muted/60"
      >
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-medium">{e.asunto}</p>
          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{e.resumen}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{nombre(e.remitente)}</span>·<span>{cuando}</span>
          {e.fechaLimite && <Badge variant="outline">Fecha: {fmtDia(e.fechaLimite, { day: "numeric", month: "short" })}</Badge>}
          <span className="truncate opacity-70">{e.cuenta}</span>
        </div>
      </a>
    </li>
  );
}

export async function Correos() {
  const { tz } = await getContext();
  const { responderHoy, esperando, informativos, errors } = await getEmailData();
  return (
    <Section title="Correos" action={<span className="text-xs text-muted-foreground">{informativos} informativos</span>}>
      <div className="space-y-5">
        {errors.length > 0 && <Empty>Problemas: {errors.join(" · ")}</Empty>}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Responder hoy ({responderHoy.length})</h3>
          {responderHoy.length ? (
            <ul className="space-y-2">{responderHoy.map((e) => <Tarjeta key={e.cuenta + e.threadId} e={e} tz={tz} />)}</ul>
          ) : (
            <Empty>Nada urgente por responder.</Empty>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Esperando respuesta ({esperando.length})</h3>
          {esperando.length ? (
            <ul className="space-y-2">{esperando.map((e) => <Tarjeta key={e.cuenta + e.threadId} e={e} tz={tz} />)}</ul>
          ) : (
            <Empty>No hay hilos tuyos sin respuesta de hace más de 3 días.</Empty>
          )}
        </div>
      </div>
    </Section>
  );
}

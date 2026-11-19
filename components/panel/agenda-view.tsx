"use client";
import { useState } from "react";
import { AlertTriangle, Clock, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgendaDia } from "@/lib/agenda";
import { fmtDia, fmtDuracion, fmtHora } from "@/lib/time";

export function AgendaView({ dias, tz }: { dias: AgendaDia[]; tz: string }) {
  const [sel, setSel] = useState(0);
  const dia = dias[sel];

  return (
    <div className="space-y-4">
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Días">
        {dias.map((d, i) => (
          <button
            key={d.fecha}
            role="tab"
            aria-selected={i === sel}
            onClick={() => setSel(i)}
            className={cn(
              "flex min-w-14 shrink-0 flex-col items-center rounded-md border px-2 py-1.5 text-xs transition-colors",
              i === sel ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted",
            )}
          >
            <span className="capitalize">{i === 0 ? "Hoy" : fmtDia(d.fecha, { weekday: "short" })}</span>
            <span className="text-sm font-semibold">{d.fecha.slice(8)}</span>
            {d.reuniones > 0 && <span className="opacity-70">{d.reuniones}</span>}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        <span className="capitalize">{fmtDia(dia.fecha)}</span> · {dia.reuniones} eventos ·{" "}
        {fmtDuracion(dia.minutosReunion)} ocupadas · {fmtDuracion(dia.minutosLibres)} libres
        {dia.conflictos > 0 && ` · ${dia.conflictos} en conflicto`}
      </p>

      {dia.todoElDia.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {dia.todoElDia.map((e) => (
            <Badge key={e.id} variant="outline" className="font-normal">
              {e.titulo}
            </Badge>
          ))}
        </div>
      )}

      {dia.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin eventos este día.</p>
      ) : (
        <ol className="relative space-y-2 border-l border-border pl-4">
          {dia.items.map((it) =>
            it.tipo === "libre" ? (
              <li key={`l-${it.inicio}`} className="relative">
                <span className="absolute -left-[21px] top-2 size-2.5 rounded-full border border-border bg-background" />
                <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                  <Clock className="mr-1.5 inline size-3.5 align-[-2px]" />
                  Tiempo disponible · {fmtHora(new Date(it.inicio), tz)} – {fmtHora(new Date(it.fin), tz)} (
                  {fmtDuracion(it.duracionMin)})
                </div>
              </li>
            ) : (
              <li key={it.evento.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[21px] top-3 size-2.5 rounded-full",
                    it.conflicto ? "bg-foreground ring-2 ring-foreground/30" : "bg-foreground/60",
                  )}
                />
                <div
                  className={cn(
                    "rounded-md border px-3 py-2",
                    it.conflicto && "border-foreground border-2",
                  )}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <a
                      href={it.evento.htmlLink}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium hover:underline"
                    >
                      {it.evento.titulo}
                    </a>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {fmtHora(new Date(it.evento.inicio), tz)} · {fmtDuracion(it.duracionMin)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {it.evento.enlaceVideo && (
                      <a
                        href={it.evento.enlaceVideo}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 underline underline-offset-2"
                      >
                        <Video className="size-3.5" /> Unirse
                      </a>
                    )}
                    {it.conflicto && (
                      <Badge variant="default" className="gap-1">
                        <AlertTriangle className="size-3" /> Conflicto
                      </Badge>
                    )}
                    {it.separacionCorta && (
                      <Badge variant="secondary">Menos de 15 min desde el anterior</Badge>
                    )}
                    <span className="truncate">{it.evento.cuenta}</span>
                  </div>
                </div>
              </li>
            ),
          )}
        </ol>
      )}
    </div>
  );
}

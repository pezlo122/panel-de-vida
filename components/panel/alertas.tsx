import { AlertTriangle } from "lucide-react";
import { getAlerts } from "@/lib/data";
import { Empty, Section } from "./section";

export async function Alertas() {
  const alertas = await getAlerts();
  return (
    <Section title="Alertas cruzadas">
      {alertas.length === 0 ? (
        <Empty>Todo cuadra entre tu correo, calendario y tareas.</Empty>
      ) : (
        <ul className="space-y-2">
          {alertas.map((a, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {a.url ? (
                <a href={a.url} target="_blank" rel="noreferrer" className="hover:underline">
                  {a.mensaje}
                </a>
              ) : (
                <span>{a.mensaje}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

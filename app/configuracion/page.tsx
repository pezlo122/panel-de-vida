import { Suspense } from "react";
import { connection } from "next/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { missingVars } from "@/lib/config-status";

async function Estado() {
  await connection();
  const faltan = missingVars();
  return (
    <ul className="space-y-3 text-sm">
      {Object.entries(faltan).map(([grupo, vars]) => (
        <li key={grupo}>
          <p className="font-medium">
            {vars.length ? "○" : "●"} {grupo}
          </p>
          {vars.length > 0 && <p className="font-mono text-xs break-all text-muted-foreground">Falta: {vars.join(", ")}</p>}
        </li>
      ))}
    </ul>
  );
}

export default function Configuracion() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">Panel de Vida · configuración pendiente</CardTitle>
          <CardDescription>
            Copia <code>.env.example</code> a <code>.env.local</code>, completa los valores y reinicia <code>npm run dev</code>.
            Los pasos de Supabase y Google están en el README.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            <Estado />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}

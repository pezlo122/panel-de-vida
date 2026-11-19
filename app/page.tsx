import { Suspense } from "react";
import { getContext } from "@/lib/data";
import { Header } from "@/components/panel/header";
import { Hoy } from "@/components/panel/hoy";
import { Agenda } from "@/components/panel/agenda";
import { Correos } from "@/components/panel/correos";
import { Tareas } from "@/components/panel/tareas";
import { Alertas } from "@/components/panel/alertas";
import { Conexiones } from "@/components/panel/conexiones";
import { SectionSkeleton } from "@/components/panel/section";

async function HeaderData() {
  const { tz, now } = await getContext();
  const fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "full", timeZone: tz }).format(now);
  return <Header fecha={fecha} />;
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:py-10">
      <Suspense fallback={<div className="h-12" />}>
        <HeaderData />
      </Suspense>
      <Suspense fallback={<div className="h-16 animate-pulse rounded-xl border bg-muted/40" />}>
        <Hoy />
      </Suspense>
      <Suspense fallback={<SectionSkeleton title="Agenda" />}>
        <Agenda />
      </Suspense>
      <Suspense fallback={<SectionSkeleton title="Correos" />}>
        <Correos />
      </Suspense>
      <Suspense fallback={<SectionSkeleton title="Tareas" />}>
        <Tareas />
      </Suspense>
      <Suspense fallback={<SectionSkeleton title="Alertas cruzadas" />}>
        <Alertas />
      </Suspense>
      <Suspense fallback={<SectionSkeleton title="Estado de conexiones" />}>
        <Conexiones />
      </Suspense>
    </main>
  );
}

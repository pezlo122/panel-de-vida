import { getAgenda, getContext, getTasks } from "@/lib/data";
import { hoyEnUnaLinea } from "@/lib/summary";
import { BriefButton } from "./brief-button";

export async function Hoy() {
  const { hoy } = await getContext();
  const [{ dias }, tasks] = await Promise.all([getAgenda(), getTasks()]);
  return (
    <section aria-label="Hoy en una línea" className="space-y-3 rounded-xl border bg-card px-4 py-4 sm:px-6">
      <p className="text-lg leading-snug font-medium sm:text-xl">{hoyEnUnaLinea(dias[0], tasks, hoy)}</p>
      <BriefButton />
    </section>
  );
}

import { getContext, getTasks } from "@/lib/data";
import { addDays } from "@/lib/time";
import { Section } from "./section";
import { TareasView } from "./tareas-view";

export async function Tareas() {
  const { hoy } = await getContext();
  const tasks = await getTasks();
  return (
    <Section title="Tareas">
      <TareasView initial={tasks} hoy={hoy} en3dias={addDays(hoy, 3)} />
    </Section>
  );
}

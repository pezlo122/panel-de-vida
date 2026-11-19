import { getAgenda, getContext } from "@/lib/data";
import { AgendaView } from "./agenda-view";
import { Empty, Section } from "./section";

export async function Agenda() {
  const { tz } = await getContext();
  const { dias, errors } = await getAgenda();
  return (
    <Section title="Agenda">
      {errors.length > 0 && <Empty>No se pudo leer: {errors.join(" · ")}</Empty>}
      <AgendaView dias={dias} tz={tz} />
    </Section>
  );
}

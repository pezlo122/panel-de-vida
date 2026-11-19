"use client";
import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createTask, createTaskFromText, deleteTask, updateTask, type TaskInput } from "@/app/actions/tasks";
import { agrupar, type Task } from "@/lib/tasks";
import { fmtDia } from "@/lib/time";
import { cn } from "@/lib/utils";

const selectCls =
  "h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function TaskForm({ initial, onSave, onCancel }: { initial?: Task; onSave: (t: TaskInput) => void; onCancel: () => void }) {
  const [f, setF] = useState<TaskInput>({
    titulo: initial?.titulo ?? "",
    descripcion: initial?.descripcion ?? "",
    fecha_limite: initial?.fecha_limite ?? null,
    prioridad: initial?.prioridad ?? "media",
    estado: initial?.estado ?? "pendiente",
    proyecto: initial?.proyecto ?? "",
  });
  return (
    <form
      className="space-y-2 rounded-md border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (f.titulo.trim()) onSave(f);
      }}
    >
      <Input aria-label="Título" placeholder="Título" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} autoFocus />
      <Textarea
        aria-label="Descripción"
        placeholder="Descripción (opcional)"
        rows={2}
        value={f.descripcion ?? ""}
        onChange={(e) => setF({ ...f, descripcion: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input
          aria-label="Fecha límite"
          type="date"
          value={f.fecha_limite ?? ""}
          onChange={(e) => setF({ ...f, fecha_limite: e.target.value || null })}
        />
        <select aria-label="Prioridad" className={selectCls} value={f.prioridad} onChange={(e) => setF({ ...f, prioridad: e.target.value as TaskInput["prioridad"] })}>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
        <select aria-label="Estado" className={selectCls} value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value as TaskInput["estado"] })}>
          <option value="pendiente">Pendiente</option>
          <option value="en_progreso">En progreso</option>
          <option value="hecha">Hecha</option>
        </select>
        <Input aria-label="Proyecto" placeholder="Proyecto" value={f.proyecto ?? ""} onChange={(e) => setF({ ...f, proyecto: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm">
          Guardar
        </Button>
      </div>
    </form>
  );
}

export function TareasView({ initial, hoy, en3dias }: { initial: Task[]; hoy: string; en3dias: string }) {
  const [tasks, setTasks] = useState(initial);
  const [linea, setLinea] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const grupos = useMemo(() => agrupar(tasks, hoy, en3dias), [tasks, hoy, en3dias]);

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      setError(null);
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      }
    });

  const replace = (t: Task) => setTasks((ts) => (t.estado === "hecha" ? ts.filter((x) => x.id !== t.id) : ts.map((x) => (x.id === t.id ? t : x))));

  const renderRow = (t: Task) =>
    editing === t.id ? (
      <li key={t.id}>
        <TaskForm
          initial={t}
          onCancel={() => setEditing(null)}
          onSave={(f) =>
            run(async () => {
              replace(await updateTask(t.id, f));
              setEditing(null);
            })
          }
        />
      </li>
    ) : (
      <li key={t.id} className="group flex items-start gap-3 rounded-md border px-3 py-2">
        <input
          type="checkbox"
          aria-label={`Marcar "${t.titulo}" como hecha`}
          className="mt-1 size-4 accent-foreground"
          onChange={() => run(async () => replace(await updateTask(t.id, { estado: "hecha" })))}
        />
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium", t.estado === "en_progreso" && "italic")}>{t.titulo}</p>
          {t.descripcion && <p className="text-sm text-muted-foreground">{t.descripcion}</p>}
          <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
            <Badge variant={t.prioridad === "alta" ? "default" : "outline"}>{t.prioridad}</Badge>
            {t.estado === "en_progreso" && <Badge variant="secondary">en progreso</Badge>}
            {t.fecha_limite && <span>{fmtDia(t.fecha_limite, { weekday: "short", day: "numeric", month: "short" })}</span>}
            {t.proyecto && <span>· {t.proyecto}</span>}
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button variant="ghost" size="icon" className="size-8" aria-label="Editar" onClick={() => setEditing(t.id)}>
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Eliminar"
            onClick={() =>
              run(async () => {
                await deleteTask(t.id);
                setTasks((ts) => ts.filter((x) => x.id !== t.id));
              })
            }
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </li>
    );

  const renderGrupo = (titulo: string, items: Task[], vacio?: string) => (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">
        {titulo} ({items.length})
      </h3>
      {items.length ? <ul className="space-y-2">{items.map((t) => renderRow(t))}</ul> : vacio && <p className="text-sm text-muted-foreground">{vacio}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const texto = linea.trim();
          if (!texto) return;
          run(async () => {
            const t = await createTaskFromText(texto);
            setTasks((ts) => [...ts, t]);
            setLinea("");
          });
        }}
      >
        <Input
          aria-label="Nueva tarea en lenguaje natural"
          placeholder='Nueva tarea: "pagar luz el viernes"'
          value={linea}
          onChange={(e) => setLinea(e.target.value)}
          disabled={pending}
        />
        <Button type="submit" disabled={pending || !linea.trim()}>
          {pending ? "…" : "Agregar"}
        </Button>
        <Button type="button" variant="outline" size="icon" aria-label="Crear tarea con formulario" onClick={() => setEditing("nueva")}>
          <Plus className="size-4" />
        </Button>
      </form>
      {error && <p className="text-sm text-muted-foreground">Error: {error}</p>}
      {editing === "nueva" && (
        <TaskForm
          onCancel={() => setEditing(null)}
          onSave={(f) =>
            run(async () => {
              const t = await createTask(f);
              if (t.estado !== "hecha") setTasks((ts) => [...ts, t]);
              setEditing(null);
            })
          }
        />
      )}
      {grupos.vencidas.length > 0 && renderGrupo("Vencidas", grupos.vencidas)}
      {renderGrupo("Hoy", grupos.hoy, "Nada vence hoy.")}
      {renderGrupo("Próximos 3 días", grupos.proximos, "Nada en los próximos 3 días.")}
      {grupos.despues.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-muted-foreground">Más adelante o sin fecha ({grupos.despues.length})</summary>
          <ul className="mt-2 space-y-2">{grupos.despues.map((t) => renderRow(t))}</ul>
        </details>
      )}
    </div>
  );
}

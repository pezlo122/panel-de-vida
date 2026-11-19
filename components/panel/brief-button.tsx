"use client";
import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BriefButton() {
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={estado === "enviando"}
        onClick={async () => {
          setEstado("enviando");
          setMsg("");
          try {
            const r = await fetch("/api/brief/send", { method: "POST" });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || "Error");
            setEstado("ok");
            setMsg("Resumen enviado a tu correo.");
          } catch (e) {
            setEstado("error");
            setMsg(e instanceof Error ? e.message : "Error");
          }
        }}
      >
        <Send className="size-3.5" />
        {estado === "enviando" ? "Generando…" : "Enviar resumen ahora"}
      </Button>
      {msg && <span className="text-xs text-muted-foreground" role="status">{msg}</span>}
    </div>
  );
}

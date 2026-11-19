import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header({ fecha }: { fecha: string }) {
  return (
    <header className="flex items-center justify-between gap-2">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Panel de Vida</h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">{fecha}</p>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <form action="/auth/signout" method="post">
          <Button variant="ghost" size="icon" aria-label="Cerrar sesión" type="submit">
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}

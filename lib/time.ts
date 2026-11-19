// Utilidades de fecha con zona horaria explícita (el servidor corre en UTC).

/** "YYYY-MM-DD" del instante dado en la zona horaria. */
export function ymd(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function addDays(ymdStr: string, n: number): string {
  const d = new Date(`${ymdStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Minutos de diferencia entre la zona y UTC en ese instante (Bogotá: -300). */
export function tzOffsetMinutes(date: Date, tz: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(date).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** Instante UTC que corresponde a la hora local `hh:mm` del día `ymdStr` en la zona. */
export function zonedTime(ymdStr: string, hh: number, mm: number, tz: string): Date {
  const guess = new Date(`${ymdStr}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00Z`);
  const off = tzOffsetMinutes(guess, tz);
  return new Date(guess.getTime() - off * 60000);
}

export function dayBounds(ymdStr: string, tz: string) {
  return { start: zonedTime(ymdStr, 0, 0, tz), end: zonedTime(addDays(ymdStr, 1), 0, 0, tz) };
}

export function fmtHora(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("es-CO", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(date);
}

export function fmtDia(ymdStr: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat("es-CO", { ...opts, timeZone: "UTC" }).format(new Date(`${ymdStr}T12:00:00Z`));
}

export function fmtDuracion(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

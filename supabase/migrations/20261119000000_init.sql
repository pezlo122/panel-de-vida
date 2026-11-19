-- Panel de Vida: esquema inicial
create extension if not exists pgcrypto;

-- ───────── tasks ─────────
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo        text not null,
  descripcion   text,
  fecha_limite  date,
  prioridad     text not null default 'media' check (prioridad in ('alta','media','baja')),
  estado        text not null default 'pendiente' check (estado in ('pendiente','en_progreso','hecha')),
  proyecto      text,
  created_at    timestamptz not null default now()
);
create index tasks_user_fecha_idx on public.tasks (user_id, fecha_limite);

-- ───────── email_classifications ─────────
create table public.email_classifications (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid() references auth.users(id) on delete cascade,
  gmail_thread_id         text not null,
  cuenta_email            text not null,
  ultimo_mensaje_id       text,
  asunto                  text,
  remitente               text,
  ultimo_mensaje_at       timestamptz,
  categoria               text not null check (categoria in ('responder_hoy','esperando_respuesta','informativo')),
  resumen_una_linea       text,
  fecha_limite_detectada  date,
  es_reunion              boolean not null default false,
  hora_detectada          text,
  updated_at              timestamptz not null default now(),
  unique (user_id, cuenta_email, gmail_thread_id)
);

-- ───────── daily_briefs ─────────
create table public.daily_briefs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha               date not null,
  contenido_markdown  text not null,
  enviado             boolean not null default false,
  created_at          timestamptz not null default now(),
  unique (user_id, fecha)
);

-- ───────── integrations ─────────
-- Una fila por cuenta conectada (p. ej. Google personal y Google universitario).
create table public.integrations (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid() references auth.users(id) on delete cascade,
  proveedor               text not null,
  cuenta_email            text not null,
  refresh_token_cifrado   text not null,
  ultima_sincronizacion   timestamptz,
  ultimo_error            text,
  created_at              timestamptz not null default now(),
  unique (user_id, proveedor, cuenta_email)
);

-- ───────── Row Level Security ─────────
do $$
declare t text;
begin
  foreach t in array array['tasks','email_classifications','daily_briefs','integrations'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s_select_own" on public.%1$I for select using (auth.uid() = user_id)', t);
    execute format('create policy "%1$s_insert_own" on public.%1$I for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "%1$s_update_own" on public.%1$I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create policy "%1$s_delete_own" on public.%1$I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

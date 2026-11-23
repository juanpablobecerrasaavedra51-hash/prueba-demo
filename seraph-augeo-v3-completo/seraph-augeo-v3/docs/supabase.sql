-- ===========================================================================
-- Seraph Augeo · base de datos del progreso
-- Postgres de Supabase. Ejecutar una vez en SQL Editor → New query → Run.
--
-- Diseño: una fila por usuario con el estado completo en JSONB. El esquema de
-- dentro (metas, hábitos, XP, cofres, artefactos, historial) lo define la app,
-- así que añadir campos nuevos no requiere migrar tablas.
-- Row Level Security garantiza que cada cuenta sólo ve su fila, aunque la
-- clave pública (anon) viaje en el navegador.
-- ===========================================================================

-- 1. Tabla ------------------------------------------------------------------
create table if not exists public.saves (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null,
  revision   bigint not null default 1,
  app        text not null default 'seraph-augeo-v3',
  client     text not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.saves is 'Un guardado por cuenta: el estado completo de Seraph Augeo.';
comment on column public.saves.revision is 'Sube en cada escritura; sirve para detectar quién escribió último.';

-- 2. Fecha de modificación --------------------------------------------------
create or replace function public.saves_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists saves_touch on public.saves;
create trigger saves_touch
  before update on public.saves
  for each row execute function public.saves_touch();

-- 3. Permisos ---------------------------------------------------------------
revoke all on public.saves from anon;
grant select, insert, update, delete on public.saves to authenticated;

-- 4. Row Level Security ----------------------------------------------------
alter table public.saves enable row level security;

drop policy if exists "saves_select_own" on public.saves;
create policy "saves_select_own"
  on public.saves for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "saves_insert_own" on public.saves;
create policy "saves_insert_own"
  on public.saves for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "saves_update_own" on public.saves;
create policy "saves_update_own"
  on public.saves for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "saves_delete_own" on public.saves;
create policy "saves_delete_own"
  on public.saves for delete
  to authenticated
  using (auth.uid() = user_id);

-- 5. Comprobación ----------------------------------------------------------
-- Debe devolver 0 filas (estás sin sesión): si devuelve algo, algo falla.
select count(*) as filas_visibles_sin_sesion from public.saves;

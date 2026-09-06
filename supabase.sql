
create table if not exists public.routine_state (
  sync_id text primary key,
  payload jsonb not null default '{"days":{},"updatedAt":0}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.routine_state enable row level security;

drop policy if exists "public routine read" on public.routine_state;
drop policy if exists "public routine insert" on public.routine_state;
drop policy if exists "public routine update" on public.routine_state;

create policy "public routine read"
on public.routine_state for select
to anon
using (true);

create policy "public routine insert"
on public.routine_state for insert
to anon
with check (true);

create policy "public routine update"
on public.routine_state for update
to anon
using (true)
with check (true);

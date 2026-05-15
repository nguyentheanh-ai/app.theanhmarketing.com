create table if not exists public.app_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "Users can read own app state" on public.app_state;
create policy "Users can read own app state"
on public.app_state
for select
to authenticated
using (id = auth.uid()::text);

drop policy if exists "Users can insert own app state" on public.app_state;
create policy "Users can insert own app state"
on public.app_state
for insert
to authenticated
with check (id = auth.uid()::text);

drop policy if exists "Users can update own app state" on public.app_state;
create policy "Users can update own app state"
on public.app_state
for update
to authenticated
using (id = auth.uid()::text)
with check (id = auth.uid()::text);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_app_state_updated_at on public.app_state;
create trigger set_app_state_updated_at
before update on public.app_state
for each row
execute function public.set_updated_at();

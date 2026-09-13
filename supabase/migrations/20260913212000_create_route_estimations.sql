create table if not exists public.route_estimations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  estimated_time_minutes integer not null check (estimated_time_minutes > 0),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  average_slope_percent numeric,
  effort_score numeric not null check (effort_score >= 0),
  derived_metrics jsonb not null default '{}'::jsonb,
  source_uploaded_at timestamptz not null,
  profile_updated_at timestamptz not null,
  computed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_route_estimations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists route_estimations_set_updated_at on public.route_estimations;
create trigger route_estimations_set_updated_at
before update on public.route_estimations
for each row
execute function public.set_route_estimations_updated_at();

alter table public.route_estimations enable row level security;

drop policy if exists "route_estimations_select_own" on public.route_estimations;
create policy "route_estimations_select_own"
on public.route_estimations
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "route_estimations_insert_own" on public.route_estimations;
create policy "route_estimations_insert_own"
on public.route_estimations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "route_estimations_update_own" on public.route_estimations;
create policy "route_estimations_update_own"
on public.route_estimations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.route_estimation_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  route_hash text not null,
  profile_signature text not null,
  estimated_time_minutes integer not null check (estimated_time_minutes > 0),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  average_slope_percent numeric,
  effort_score numeric not null check (effort_score >= 0),
  derived_metrics jsonb not null default '{}'::jsonb,
  source_uploaded_at timestamptz not null,
  profile_updated_at timestamptz not null,
  computed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, route_hash, profile_signature)
);

create index if not exists route_estimation_history_user_order_idx
  on public.route_estimation_history (user_id, computed_at desc, id desc);

create or replace function public.set_route_estimation_history_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists route_estimation_history_set_updated_at on public.route_estimation_history;
create trigger route_estimation_history_set_updated_at
before update on public.route_estimation_history
for each row
execute function public.set_route_estimation_history_updated_at();

alter table public.route_estimation_history enable row level security;

drop policy if exists "route_estimation_history_select_own" on public.route_estimation_history;
create policy "route_estimation_history_select_own"
on public.route_estimation_history
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "route_estimation_history_insert_own" on public.route_estimation_history;
create policy "route_estimation_history_insert_own"
on public.route_estimation_history
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "route_estimation_history_update_own" on public.route_estimation_history;
create policy "route_estimation_history_update_own"
on public.route_estimation_history
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

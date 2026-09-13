create table if not exists public.route_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  source_file_name text not null,
  source_file_size_bytes integer not null check (source_file_size_bytes > 0),
  point_count integer not null check (point_count > 1),
  total_distance_m numeric not null check (total_distance_m >= 0),
  elevation_gain_m numeric,
  elevation_loss_m numeric,
  min_elevation_m numeric,
  max_elevation_m numeric,
  start_lat numeric not null,
  start_lng numeric not null,
  end_lat numeric not null,
  end_lng numeric not null,
  bounds jsonb not null,
  geometry jsonb not null,
  uploaded_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_route_snapshots_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists route_snapshots_set_updated_at on public.route_snapshots;
create trigger route_snapshots_set_updated_at
before update on public.route_snapshots
for each row
execute function public.set_route_snapshots_updated_at();

alter table public.route_snapshots enable row level security;

drop policy if exists "route_snapshots_select_own" on public.route_snapshots;
create policy "route_snapshots_select_own"
on public.route_snapshots
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "route_snapshots_insert_own" on public.route_snapshots;
create policy "route_snapshots_insert_own"
on public.route_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "route_snapshots_update_own" on public.route_snapshots;
create policy "route_snapshots_update_own"
on public.route_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.saved_route_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  route_hash text not null,
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
  uploaded_at timestamptz not null,
  last_estimated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, route_hash)
);

create index if not exists saved_route_history_user_order_idx
  on public.saved_route_history (user_id, last_estimated_at desc, id desc);

create or replace function public.set_saved_route_history_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists saved_route_history_set_updated_at on public.saved_route_history;
create trigger saved_route_history_set_updated_at
before update on public.saved_route_history
for each row
execute function public.set_saved_route_history_updated_at();

alter table public.saved_route_history enable row level security;

drop policy if exists "saved_route_history_select_own" on public.saved_route_history;
create policy "saved_route_history_select_own"
on public.saved_route_history
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "saved_route_history_insert_own" on public.saved_route_history;
create policy "saved_route_history_insert_own"
on public.saved_route_history
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "saved_route_history_update_own" on public.saved_route_history;
create policy "saved_route_history_update_own"
on public.saved_route_history
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

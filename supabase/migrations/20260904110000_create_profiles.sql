create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  experience_level text,
  weight_kg numeric,
  weekly_distance_km numeric,
  status text not null default 'draft' check (status in ('draft', 'complete')),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_complete_requires_fields check (
    status <> 'complete'
    or (
      experience_level is not null
      and length(trim(experience_level)) > 0
      and weight_kg is not null
      and weight_kg > 0
      and weekly_distance_km is not null
      and weekly_distance_km > 0
    )
  )
);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

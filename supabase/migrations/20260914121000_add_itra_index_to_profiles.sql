alter table public.profiles
  add column if not exists itra_index integer;

alter table public.profiles
  drop constraint if exists profiles_itra_index_positive;

alter table public.profiles
  add constraint profiles_itra_index_positive
  check (itra_index is null or itra_index > 0);

alter table public.profiles
  drop constraint if exists profiles_itra_index_positive;

alter table public.profiles
  drop constraint if exists profiles_itra_index_valid_range;

alter table public.profiles
  add constraint profiles_itra_index_valid_range
  check (itra_index is null or (itra_index between 1 and 1000));

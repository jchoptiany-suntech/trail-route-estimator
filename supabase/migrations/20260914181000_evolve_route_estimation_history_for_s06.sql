alter table public.route_estimation_history
  add column if not exists history_version integer not null default 1,
  add column if not exists recomputed_from_history_id bigint null,
  add column if not exists is_legacy boolean not null default false,
  add column if not exists source_file_name text null,
  add column if not exists total_distance_m numeric null,
  add column if not exists elevation_gain_m numeric null,
  add column if not exists planned_run_at timestamptz null,
  add column if not exists planned_run_timezone_offset_minutes integer null;

alter table public.route_estimation_history
  drop constraint if exists route_estimation_history_planned_run_timezone_offset_minutes_check;

alter table public.route_estimation_history
  add constraint route_estimation_history_planned_run_timezone_offset_minutes_check
  check (
    planned_run_timezone_offset_minutes is null
    or (planned_run_timezone_offset_minutes between -840 and 840)
  );

alter table public.route_estimation_history
  drop constraint if exists route_estimation_history_recomputed_from_history_id_fkey;

alter table public.route_estimation_history
  add constraint route_estimation_history_recomputed_from_history_id_fkey
  foreign key (recomputed_from_history_id)
  references public.route_estimation_history(id)
  on delete set null;

alter table public.route_estimation_history
  drop constraint if exists route_estimation_history_user_id_route_hash_profile_signature_key;

alter table public.route_estimation_history
  drop constraint if exists route_estimation_history_user_route_profile_version_key;

alter table public.route_estimation_history
  add constraint route_estimation_history_user_route_profile_version_key
  unique (user_id, route_hash, profile_signature, history_version);

create index if not exists route_estimation_history_user_concept_version_idx
  on public.route_estimation_history (user_id, route_hash, profile_signature, history_version desc);

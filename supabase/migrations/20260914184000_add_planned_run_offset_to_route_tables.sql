alter table public.route_snapshots
  add column if not exists planned_run_timezone_offset_minutes integer null;

alter table public.route_snapshots
  drop constraint if exists route_snapshots_planned_run_timezone_offset_minutes_check;

alter table public.route_snapshots
  add constraint route_snapshots_planned_run_timezone_offset_minutes_check
  check (
    planned_run_timezone_offset_minutes is null
    or (planned_run_timezone_offset_minutes between -840 and 840)
  );

alter table public.saved_route_history
  add column if not exists planned_run_timezone_offset_minutes integer null;

alter table public.saved_route_history
  drop constraint if exists saved_route_history_planned_run_timezone_offset_minutes_check;

alter table public.saved_route_history
  add constraint saved_route_history_planned_run_timezone_offset_minutes_check
  check (
    planned_run_timezone_offset_minutes is null
    or (planned_run_timezone_offset_minutes between -840 and 840)
  );

alter table public.route_snapshots
  add column if not exists planned_run_at timestamptz;

alter table public.saved_route_history
  add column if not exists planned_run_at timestamptz;

create or replace function public.persist_route_estimation_bundle(
  p_user_id uuid,
  p_route_hash text,
  p_profile_signature text,
  p_estimated_time_minutes integer,
  p_difficulty text,
  p_average_slope_percent numeric,
  p_effort_score numeric,
  p_derived_metrics jsonb,
  p_source_uploaded_at timestamptz,
  p_profile_updated_at timestamptz,
  p_computed_at timestamptz,
  p_source_file_name text,
  p_source_file_size_bytes integer,
  p_point_count integer,
  p_total_distance_m numeric,
  p_elevation_gain_m numeric,
  p_elevation_loss_m numeric,
  p_min_elevation_m numeric,
  p_max_elevation_m numeric,
  p_start_lat numeric,
  p_start_lng numeric,
  p_end_lat numeric,
  p_end_lng numeric,
  p_bounds jsonb,
  p_planned_run_at timestamptz
)
returns void
language plpgsql
security invoker
as $$
begin
  insert into public.route_estimations (
    user_id,
    estimated_time_minutes,
    difficulty,
    average_slope_percent,
    effort_score,
    derived_metrics,
    source_uploaded_at,
    profile_updated_at,
    computed_at
  )
  values (
    p_user_id,
    p_estimated_time_minutes,
    p_difficulty,
    p_average_slope_percent,
    p_effort_score,
    p_derived_metrics,
    p_source_uploaded_at,
    p_profile_updated_at,
    p_computed_at
  )
  on conflict (user_id) do update
  set
    estimated_time_minutes = excluded.estimated_time_minutes,
    difficulty = excluded.difficulty,
    average_slope_percent = excluded.average_slope_percent,
    effort_score = excluded.effort_score,
    derived_metrics = excluded.derived_metrics,
    source_uploaded_at = excluded.source_uploaded_at,
    profile_updated_at = excluded.profile_updated_at,
    computed_at = excluded.computed_at;

  insert into public.route_estimation_history (
    user_id,
    route_hash,
    profile_signature,
    history_version,
    recomputed_from_history_id,
    is_legacy,
    source_file_name,
    total_distance_m,
    elevation_gain_m,
    planned_run_at,
    planned_run_timezone_offset_minutes,
    estimated_time_minutes,
    difficulty,
    average_slope_percent,
    effort_score,
    derived_metrics,
    source_uploaded_at,
    profile_updated_at,
    computed_at
  )
  values (
    p_user_id,
    p_route_hash,
    p_profile_signature,
    1,
    null,
    false,
    p_source_file_name,
    p_total_distance_m,
    p_elevation_gain_m,
    p_planned_run_at,
    null,
    p_estimated_time_minutes,
    p_difficulty,
    p_average_slope_percent,
    p_effort_score,
    p_derived_metrics,
    p_source_uploaded_at,
    p_profile_updated_at,
    p_computed_at
  )
  on conflict (user_id, route_hash, profile_signature, history_version) do update
  set
    recomputed_from_history_id = excluded.recomputed_from_history_id,
    is_legacy = excluded.is_legacy,
    source_file_name = excluded.source_file_name,
    total_distance_m = excluded.total_distance_m,
    elevation_gain_m = excluded.elevation_gain_m,
    planned_run_at = excluded.planned_run_at,
    planned_run_timezone_offset_minutes = excluded.planned_run_timezone_offset_minutes,
    estimated_time_minutes = excluded.estimated_time_minutes,
    difficulty = excluded.difficulty,
    average_slope_percent = excluded.average_slope_percent,
    effort_score = excluded.effort_score,
    derived_metrics = excluded.derived_metrics,
    source_uploaded_at = excluded.source_uploaded_at,
    profile_updated_at = excluded.profile_updated_at,
    computed_at = excluded.computed_at;

  insert into public.saved_route_history (
    user_id,
    route_hash,
    source_file_name,
    source_file_size_bytes,
    point_count,
    total_distance_m,
    elevation_gain_m,
    elevation_loss_m,
    min_elevation_m,
    max_elevation_m,
    start_lat,
    start_lng,
    end_lat,
    end_lng,
    bounds,
    planned_run_at,
    uploaded_at,
    last_estimated_at
  )
  values (
    p_user_id,
    p_route_hash,
    p_source_file_name,
    p_source_file_size_bytes,
    p_point_count,
    p_total_distance_m,
    p_elevation_gain_m,
    p_elevation_loss_m,
    p_min_elevation_m,
    p_max_elevation_m,
    p_start_lat,
    p_start_lng,
    p_end_lat,
    p_end_lng,
    p_bounds,
    p_planned_run_at,
    p_source_uploaded_at,
    p_computed_at
  )
  on conflict (user_id, route_hash) do update
  set
    source_file_name = excluded.source_file_name,
    source_file_size_bytes = excluded.source_file_size_bytes,
    point_count = excluded.point_count,
    total_distance_m = excluded.total_distance_m,
    elevation_gain_m = excluded.elevation_gain_m,
    elevation_loss_m = excluded.elevation_loss_m,
    min_elevation_m = excluded.min_elevation_m,
    max_elevation_m = excluded.max_elevation_m,
    start_lat = excluded.start_lat,
    start_lng = excluded.start_lng,
    end_lat = excluded.end_lat,
    end_lng = excluded.end_lng,
    bounds = excluded.bounds,
    planned_run_at = excluded.planned_run_at,
    uploaded_at = excluded.uploaded_at,
    last_estimated_at = excluded.last_estimated_at;
end;
$$;

create extension if not exists pgcrypto;

create or replace function public.compute_route_shape_hash_v2(
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
  p_bounds jsonb
)
returns text
language sql
immutable
as $$
  select encode(
    digest(
      concat_ws(
        '|',
        'route-shape-v2',
        'pointCount=' || coalesce(p_point_count::text, 'null'),
        'totalDistanceM=' || coalesce(to_char(p_total_distance_m, 'FM9999999999999990.000000'), 'null'),
        'elevationGainM=' || coalesce(to_char(p_elevation_gain_m, 'FM9999999999999990.000000'), 'null'),
        'elevationLossM=' || coalesce(to_char(p_elevation_loss_m, 'FM9999999999999990.000000'), 'null'),
        'minElevationM=' || coalesce(to_char(p_min_elevation_m, 'FM9999999999999990.000000'), 'null'),
        'maxElevationM=' || coalesce(to_char(p_max_elevation_m, 'FM9999999999999990.000000'), 'null'),
        'startLat=' || coalesce(to_char(p_start_lat, 'FM9999999999999990.000000'), 'null'),
        'startLng=' || coalesce(to_char(p_start_lng, 'FM9999999999999990.000000'), 'null'),
        'endLat=' || coalesce(to_char(p_end_lat, 'FM9999999999999990.000000'), 'null'),
        'endLng=' || coalesce(to_char(p_end_lng, 'FM9999999999999990.000000'), 'null'),
        'bounds.minLat=' || coalesce(to_char((p_bounds ->> 'minLat')::numeric, 'FM9999999999999990.000000'), 'null'),
        'bounds.minLng=' || coalesce(to_char((p_bounds ->> 'minLng')::numeric, 'FM9999999999999990.000000'), 'null'),
        'bounds.maxLat=' || coalesce(to_char((p_bounds ->> 'maxLat')::numeric, 'FM9999999999999990.000000'), 'null'),
        'bounds.maxLng=' || coalesce(to_char((p_bounds ->> 'maxLng')::numeric, 'FM9999999999999990.000000'), 'null')
      ),
      'sha256'
    ),
    'hex'
  );
$$;

create temporary table tmp_saved_route_hash_map on commit drop as
select
  s.id,
  s.user_id,
  s.route_hash as old_route_hash,
  public.compute_route_shape_hash_v2(
    s.point_count,
    s.total_distance_m,
    s.elevation_gain_m,
    s.elevation_loss_m,
    s.min_elevation_m,
    s.max_elevation_m,
    s.start_lat,
    s.start_lng,
    s.end_lat,
    s.end_lng,
    s.bounds::jsonb
  ) as new_route_hash
from public.saved_route_history s;

create temporary table tmp_saved_route_history_next on commit drop as
with ranked as (
  select
    s.user_id,
    m.new_route_hash as route_hash,
    s.source_file_name,
    s.source_file_size_bytes,
    s.point_count,
    s.total_distance_m,
    s.elevation_gain_m,
    s.elevation_loss_m,
    s.min_elevation_m,
    s.max_elevation_m,
    s.start_lat,
    s.start_lng,
    s.end_lat,
    s.end_lng,
    s.bounds,
    s.uploaded_at,
    s.last_estimated_at,
    min(s.created_at) over (partition by s.user_id, m.new_route_hash) as created_at,
    row_number() over (
      partition by s.user_id, m.new_route_hash
      order by s.last_estimated_at desc, s.updated_at desc, s.id desc
    ) as rn
  from public.saved_route_history s
  join tmp_saved_route_hash_map m on m.id = s.id
)
select
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
  uploaded_at,
  last_estimated_at,
  created_at
from ranked
where rn = 1;

delete from public.saved_route_history;

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
  uploaded_at,
  last_estimated_at,
  created_at
)
select
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
  uploaded_at,
  last_estimated_at,
  created_at
from tmp_saved_route_history_next;

create temporary table tmp_route_estimation_history_next on commit drop as
with rehashed as (
  select
    h.*,
    coalesce(m.new_route_hash, h.route_hash) as next_route_hash
  from public.route_estimation_history h
  left join (
    select distinct user_id, old_route_hash, new_route_hash
    from tmp_saved_route_hash_map
  ) m
    on m.user_id = h.user_id
   and m.old_route_hash = h.route_hash
),
ranked as (
  select
    user_id,
    next_route_hash as route_hash,
    profile_signature,
    estimated_time_minutes,
    difficulty,
    average_slope_percent,
    effort_score,
    derived_metrics,
    source_uploaded_at,
    profile_updated_at,
    computed_at,
    min(created_at) over (partition by user_id, next_route_hash, profile_signature) as created_at,
    row_number() over (
      partition by user_id, next_route_hash, profile_signature
      order by computed_at desc, updated_at desc, id desc
    ) as rn
  from rehashed
)
select
  user_id,
  route_hash,
  profile_signature,
  estimated_time_minutes,
  difficulty,
  average_slope_percent,
  effort_score,
  derived_metrics,
  source_uploaded_at,
  profile_updated_at,
  computed_at,
  created_at
from ranked
where rn = 1;

delete from public.route_estimation_history;

insert into public.route_estimation_history (
  user_id,
  route_hash,
  profile_signature,
  estimated_time_minutes,
  difficulty,
  average_slope_percent,
  effort_score,
  derived_metrics,
  source_uploaded_at,
  profile_updated_at,
  computed_at,
  created_at
)
select
  user_id,
  route_hash,
  profile_signature,
  estimated_time_minutes,
  difficulty,
  average_slope_percent,
  effort_score,
  derived_metrics,
  source_uploaded_at,
  profile_updated_at,
  computed_at,
  created_at
from tmp_route_estimation_history_next;

drop function public.compute_route_shape_hash_v2(
  integer,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  jsonb
);

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SavedRouteHistoryEntry, SavedRouteHistoryRow } from "@/lib/estimation/types";
import type { RouteSnapshot, RouteSnapshotInput, RouteSnapshotRow } from "@/lib/route/types";

function mapRowToRouteSnapshot(row: RouteSnapshotRow): RouteSnapshot {
  return {
    userId: row.user_id,
    sourceFileName: row.source_file_name,
    sourceFileSizeBytes: row.source_file_size_bytes,
    pointCount: row.point_count,
    totalDistanceM: row.total_distance_m,
    elevationGainM: row.elevation_gain_m,
    elevationLossM: row.elevation_loss_m,
    minElevationM: row.min_elevation_m,
    maxElevationM: row.max_elevation_m,
    startLat: row.start_lat,
    startLng: row.start_lng,
    endLat: row.end_lat,
    endLng: row.end_lng,
    bounds: row.bounds,
    geometry: row.geometry,
    plannedRunAt: row.planned_run_at,
    plannedRunTimezoneOffsetMinutes: row.planned_run_timezone_offset_minutes,
    uploadedAt: row.uploaded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToSavedRouteHistory(row: SavedRouteHistoryRow): SavedRouteHistoryEntry {
  return {
    id: row.id,
    userId: row.user_id,
    routeHash: row.route_hash,
    sourceFileName: row.source_file_name,
    sourceFileSizeBytes: row.source_file_size_bytes,
    pointCount: row.point_count,
    totalDistanceM: row.total_distance_m,
    elevationGainM: row.elevation_gain_m,
    elevationLossM: row.elevation_loss_m,
    minElevationM: row.min_elevation_m,
    maxElevationM: row.max_elevation_m,
    startLat: row.start_lat,
    startLng: row.start_lng,
    endLat: row.end_lat,
    endLng: row.end_lng,
    bounds: row.bounds,
    plannedRunAt: row.planned_run_at,
    plannedRunTimezoneOffsetMinutes: row.planned_run_timezone_offset_minutes,
    uploadedAt: row.uploaded_at,
    lastEstimatedAt: row.last_estimated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ROUTE_SNAPSHOT_SELECT =
  "user_id, source_file_name, source_file_size_bytes, point_count, total_distance_m, elevation_gain_m, elevation_loss_m, min_elevation_m, max_elevation_m, start_lat, start_lng, end_lat, end_lng, bounds, geometry, planned_run_at, planned_run_timezone_offset_minutes, uploaded_at, created_at, updated_at";
const SAVED_ROUTE_HISTORY_SELECT =
  "id, user_id, route_hash, source_file_name, source_file_size_bytes, point_count, total_distance_m, elevation_gain_m, elevation_loss_m, min_elevation_m, max_elevation_m, start_lat, start_lng, end_lat, end_lng, bounds, planned_run_at, planned_run_timezone_offset_minutes, uploaded_at, last_estimated_at, created_at, updated_at";

export async function getRouteSnapshotForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: RouteSnapshot | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("route_snapshots")
    .select(ROUTE_SNAPSHOT_SELECT)
    .eq("user_id", userId)
    .maybeSingle<RouteSnapshotRow>();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return { data: mapRowToRouteSnapshot(data), error: null };
}

export async function listSavedRouteHistoryForUser(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
): Promise<{ data: SavedRouteHistoryEntry[]; error: Error | null }> {
  const boundedLimit = Math.max(1, Math.min(limit, 100));
  const { data, error } = await supabase
    .from("saved_route_history")
    .select(SAVED_ROUTE_HISTORY_SELECT)
    .eq("user_id", userId)
    .order("last_estimated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(boundedLimit);

  if (error) {
    return { data: [], error };
  }

  return {
    data: data.map((row) => mapRowToSavedRouteHistory(row)),
    error: null,
  };
}

export async function upsertSavedRouteHistoryForUser(
  supabase: SupabaseClient,
  userId: string,
  routeHash: string,
  snapshot: RouteSnapshot,
  lastEstimatedAt: string,
): Promise<{ data: SavedRouteHistoryEntry | null; error: Error | null }> {
  const payload = {
    user_id: userId,
    route_hash: routeHash,
    source_file_name: snapshot.sourceFileName,
    source_file_size_bytes: snapshot.sourceFileSizeBytes,
    point_count: snapshot.pointCount,
    total_distance_m: snapshot.totalDistanceM,
    elevation_gain_m: snapshot.elevationGainM,
    elevation_loss_m: snapshot.elevationLossM,
    min_elevation_m: snapshot.minElevationM,
    max_elevation_m: snapshot.maxElevationM,
    start_lat: snapshot.startLat,
    start_lng: snapshot.startLng,
    end_lat: snapshot.endLat,
    end_lng: snapshot.endLng,
    bounds: snapshot.bounds,
    planned_run_at: snapshot.plannedRunAt ?? null,
    planned_run_timezone_offset_minutes: snapshot.plannedRunTimezoneOffsetMinutes ?? null,
    uploaded_at: snapshot.uploadedAt,
    last_estimated_at: lastEstimatedAt,
  };

  const { data, error } = await supabase
    .from("saved_route_history")
    .upsert(payload, { onConflict: "user_id,route_hash" })
    .select(SAVED_ROUTE_HISTORY_SELECT)
    .single<SavedRouteHistoryRow>();

  if (error) {
    return { data: null, error };
  }

  return { data: mapRowToSavedRouteHistory(data), error: null };
}

export async function upsertRouteSnapshotForUser(
  supabase: SupabaseClient,
  userId: string,
  input: RouteSnapshotInput,
): Promise<{ data: RouteSnapshot | null; error: Error | null }> {
  const payload = {
    user_id: userId,
    source_file_name: input.sourceFileName,
    source_file_size_bytes: input.sourceFileSizeBytes,
    point_count: input.metrics.pointCount,
    total_distance_m: input.metrics.totalDistanceM,
    elevation_gain_m: input.metrics.elevationGainM,
    elevation_loss_m: input.metrics.elevationLossM,
    min_elevation_m: input.metrics.minElevationM,
    max_elevation_m: input.metrics.maxElevationM,
    start_lat: input.startLat,
    start_lng: input.startLng,
    end_lat: input.endLat,
    end_lng: input.endLng,
    bounds: input.bounds,
    geometry: input.geometry,
    planned_run_at: input.plannedRunAt ?? null,
    planned_run_timezone_offset_minutes: input.plannedRunTimezoneOffsetMinutes ?? null,
    uploaded_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("route_snapshots")
    .upsert(payload, { onConflict: "user_id" })
    .select(ROUTE_SNAPSHOT_SELECT)
    .single<RouteSnapshotRow>();

  if (error) {
    return { data: null, error };
  }

  return { data: mapRowToRouteSnapshot(data), error: null };
}

export async function updateRouteSnapshotPlannedRunForUser(
  supabase: SupabaseClient,
  userId: string,
  input: { plannedRunAt: string | null; plannedRunTimezoneOffsetMinutes: number | null },
): Promise<{ data: RouteSnapshot | null; error: Error | null }> {
  const payload = {
    planned_run_at: input.plannedRunAt,
    planned_run_timezone_offset_minutes: input.plannedRunTimezoneOffsetMinutes,
  };

  const { data, error } = await supabase
    .from("route_snapshots")
    .update(payload)
    .eq("user_id", userId)
    .select(ROUTE_SNAPSHOT_SELECT)
    .maybeSingle<RouteSnapshotRow>();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return { data: mapRowToRouteSnapshot(data), error: null };
}

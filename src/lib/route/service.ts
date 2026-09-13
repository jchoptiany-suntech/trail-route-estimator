import type { SupabaseClient } from "@supabase/supabase-js";
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
    uploadedAt: row.uploaded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ROUTE_SNAPSHOT_SELECT =
  "user_id, source_file_name, source_file_size_bytes, point_count, total_distance_m, elevation_gain_m, elevation_loss_m, min_elevation_m, max_elevation_m, start_lat, start_lng, end_lat, end_lng, bounds, geometry, uploaded_at, created_at, updated_at";

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

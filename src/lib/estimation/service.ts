import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RouteEstimationDeduplicationKey,
  RouteEstimationComputation,
  RouteEstimationHistoryEntry,
  RouteEstimationHistoryRow,
  RouteEstimationInputSnapshot,
  RouteEstimationRow,
  RouteEstimationSnapshot,
} from "@/lib/estimation/types";
import type { RouteSnapshot } from "@/lib/route/types";

const ROUTE_ESTIMATION_SELECT =
  "user_id, estimated_time_minutes, difficulty, average_slope_percent, effort_score, derived_metrics, source_uploaded_at, profile_updated_at, computed_at, created_at, updated_at";
const ROUTE_ESTIMATION_HISTORY_SELECT =
  "id, user_id, route_hash, profile_signature, estimated_time_minutes, difficulty, average_slope_percent, effort_score, derived_metrics, source_uploaded_at, profile_updated_at, computed_at, created_at, updated_at";

function mapRowToRouteEstimation(row: RouteEstimationRow): RouteEstimationSnapshot {
  return {
    userId: row.user_id,
    estimatedTimeMinutes: row.estimated_time_minutes,
    difficulty: row.difficulty,
    derivedMetrics: row.derived_metrics,
    sourceUploadedAt: row.source_uploaded_at,
    profileUpdatedAt: row.profile_updated_at,
    computedAt: row.computed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToRouteEstimationHistory(row: RouteEstimationHistoryRow): RouteEstimationHistoryEntry {
  return {
    id: row.id,
    userId: row.user_id,
    deduplicationKey: {
      routeHash: row.route_hash,
      profileSignature: row.profile_signature,
    },
    estimatedTimeMinutes: row.estimated_time_minutes,
    difficulty: row.difficulty,
    derivedMetrics: row.derived_metrics,
    sourceUploadedAt: row.source_uploaded_at,
    profileUpdatedAt: row.profile_updated_at,
    computedAt: row.computed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getRouteEstimationForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: RouteEstimationSnapshot | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("route_estimations")
    .select(ROUTE_ESTIMATION_SELECT)
    .eq("user_id", userId)
    .maybeSingle<RouteEstimationRow>();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return { data: mapRowToRouteEstimation(data), error: null };
}

export async function upsertRouteEstimationForUser(
  supabase: SupabaseClient,
  userId: string,
  result: RouteEstimationComputation,
  inputSnapshot: RouteEstimationInputSnapshot,
): Promise<{ data: RouteEstimationSnapshot | null; error: Error | null }> {
  const payload = {
    user_id: userId,
    estimated_time_minutes: result.estimatedTimeMinutes,
    difficulty: result.difficulty,
    average_slope_percent: result.derivedMetrics.averageSlopePercent,
    effort_score: result.derivedMetrics.effortScore,
    derived_metrics: result.derivedMetrics,
    source_uploaded_at: inputSnapshot.sourceUploadedAt,
    profile_updated_at: inputSnapshot.profileUpdatedAt,
    computed_at: result.computedAt,
  };

  const { data, error } = await supabase
    .from("route_estimations")
    .upsert(payload, { onConflict: "user_id" })
    .select(ROUTE_ESTIMATION_SELECT)
    .single<RouteEstimationRow>();

  if (error) {
    return { data: null, error };
  }

  return { data: mapRowToRouteEstimation(data), error: null };
}

export async function listRouteEstimationHistoryForUser(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
): Promise<{ data: RouteEstimationHistoryEntry[]; error: Error | null }> {
  const boundedLimit = Math.max(1, Math.min(limit, 100));
  const { data, error } = await supabase
    .from("route_estimation_history")
    .select(ROUTE_ESTIMATION_HISTORY_SELECT)
    .eq("user_id", userId)
    .order("computed_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(boundedLimit);

  if (error) {
    return { data: [], error };
  }

  return {
    data: data.map((row) => mapRowToRouteEstimationHistory(row)),
    error: null,
  };
}

export async function upsertRouteEstimationHistoryEntryForUser(
  supabase: SupabaseClient,
  userId: string,
  deduplicationKey: RouteEstimationDeduplicationKey,
  result: RouteEstimationComputation,
  inputSnapshot: RouteEstimationInputSnapshot,
): Promise<{ data: RouteEstimationHistoryEntry | null; error: Error | null }> {
  const payload = {
    user_id: userId,
    route_hash: deduplicationKey.routeHash,
    profile_signature: deduplicationKey.profileSignature,
    estimated_time_minutes: result.estimatedTimeMinutes,
    difficulty: result.difficulty,
    average_slope_percent: result.derivedMetrics.averageSlopePercent,
    effort_score: result.derivedMetrics.effortScore,
    derived_metrics: result.derivedMetrics,
    source_uploaded_at: inputSnapshot.sourceUploadedAt,
    profile_updated_at: inputSnapshot.profileUpdatedAt,
    computed_at: result.computedAt,
  };

  const { data, error } = await supabase
    .from("route_estimation_history")
    .upsert(payload, { onConflict: "user_id,route_hash,profile_signature" })
    .select(ROUTE_ESTIMATION_HISTORY_SELECT)
    .single<RouteEstimationHistoryRow>();

  if (error) {
    return { data: null, error };
  }

  return { data: mapRowToRouteEstimationHistory(data), error: null };
}

export async function persistRouteEstimationBundle(
  supabase: SupabaseClient,
  userId: string,
  deduplicationKey: RouteEstimationDeduplicationKey,
  result: RouteEstimationComputation,
  inputSnapshot: RouteEstimationInputSnapshot,
  routeSnapshot: RouteSnapshot,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc("persist_route_estimation_bundle", {
    p_user_id: userId,
    p_route_hash: deduplicationKey.routeHash,
    p_profile_signature: deduplicationKey.profileSignature,
    p_estimated_time_minutes: result.estimatedTimeMinutes,
    p_difficulty: result.difficulty,
    p_average_slope_percent: result.derivedMetrics.averageSlopePercent,
    p_effort_score: result.derivedMetrics.effortScore,
    p_derived_metrics: result.derivedMetrics,
    p_source_uploaded_at: inputSnapshot.sourceUploadedAt,
    p_profile_updated_at: inputSnapshot.profileUpdatedAt,
    p_computed_at: result.computedAt,
    p_source_file_name: routeSnapshot.sourceFileName,
    p_source_file_size_bytes: routeSnapshot.sourceFileSizeBytes,
    p_point_count: routeSnapshot.pointCount,
    p_total_distance_m: routeSnapshot.totalDistanceM,
    p_elevation_gain_m: routeSnapshot.elevationGainM,
    p_elevation_loss_m: routeSnapshot.elevationLossM,
    p_min_elevation_m: routeSnapshot.minElevationM,
    p_max_elevation_m: routeSnapshot.maxElevationM,
    p_start_lat: routeSnapshot.startLat,
    p_start_lng: routeSnapshot.startLng,
    p_end_lat: routeSnapshot.endLat,
    p_end_lng: routeSnapshot.endLng,
    p_bounds: routeSnapshot.bounds,
  });

  return { error };
}

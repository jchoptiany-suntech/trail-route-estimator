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

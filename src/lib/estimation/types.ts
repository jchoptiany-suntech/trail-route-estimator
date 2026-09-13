import type { RouteSnapshot } from "@/lib/route/types";

export const ESTIMATION_DIFFICULTY_LABELS = ["easy", "medium", "hard"] as const;

export type DifficultyLabel = (typeof ESTIMATION_DIFFICULTY_LABELS)[number];

export interface EstimationProfileInput {
  experienceLevel: string;
  weightKg: number;
  weeklyDistanceKm: number;
  updatedAt: string;
}

export interface EstimationDerivedMetrics {
  averageSlopePercent: number | null;
  elevationPerKmM: number | null;
  profileAdjustmentFactor: number;
  effortScore: number;
}

export interface RouteEstimationInput {
  userId: string;
  routeSnapshot: RouteSnapshot;
  profile: EstimationProfileInput;
}

export interface RouteEstimationComputation {
  estimatedTimeMinutes: number;
  difficulty: DifficultyLabel;
  derivedMetrics: EstimationDerivedMetrics;
  computedAt: string;
}

export interface RouteEstimationInputSnapshot {
  sourceUploadedAt: string;
  profileUpdatedAt: string;
}

export interface RouteEstimationSnapshot extends RouteEstimationComputation, RouteEstimationInputSnapshot {
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RouteEstimationDeduplicationKey {
  routeHash: string;
  profileSignature: string;
}

export interface RouteEstimationRow {
  user_id: string;
  estimated_time_minutes: number;
  difficulty: DifficultyLabel;
  average_slope_percent: number | null;
  effort_score: number;
  derived_metrics: EstimationDerivedMetrics;
  source_uploaded_at: string;
  profile_updated_at: string;
  computed_at: string;
  created_at: string;
  updated_at: string;
}

export interface RouteEstimationHistoryEntry extends RouteEstimationComputation, RouteEstimationInputSnapshot {
  id: number;
  userId: string;
  deduplicationKey: RouteEstimationDeduplicationKey;
  createdAt: string;
  updatedAt: string;
}

export interface RouteEstimationHistoryRow {
  id: number;
  user_id: string;
  route_hash: string;
  profile_signature: string;
  estimated_time_minutes: number;
  difficulty: DifficultyLabel;
  average_slope_percent: number | null;
  effort_score: number;
  derived_metrics: EstimationDerivedMetrics;
  source_uploaded_at: string;
  profile_updated_at: string;
  computed_at: string;
  created_at: string;
  updated_at: string;
}

export interface SavedRouteHistoryEntry {
  id: number;
  userId: string;
  routeHash: string;
  sourceFileName: string;
  sourceFileSizeBytes: number;
  pointCount: number;
  totalDistanceM: number;
  elevationGainM: number | null;
  elevationLossM: number | null;
  minElevationM: number | null;
  maxElevationM: number | null;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  bounds: RouteSnapshot["bounds"];
  uploadedAt: string;
  lastEstimatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedRouteHistoryRow {
  id: number;
  user_id: string;
  route_hash: string;
  source_file_name: string;
  source_file_size_bytes: number;
  point_count: number;
  total_distance_m: number;
  elevation_gain_m: number | null;
  elevation_loss_m: number | null;
  min_elevation_m: number | null;
  max_elevation_m: number | null;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  bounds: RouteSnapshot["bounds"];
  uploaded_at: string;
  last_estimated_at: string;
  created_at: string;
  updated_at: string;
}

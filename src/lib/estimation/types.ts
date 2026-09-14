import type { RouteSnapshot } from "@/lib/route/types";

export const ESTIMATION_DIFFICULTY_LABELS = ["easy", "medium", "hard"] as const;
export const EXTERNAL_SIGNAL_STATUSES = ["available", "missing", "not_applicable", "provider_error"] as const;

export const ITRA_GLOBAL_MULTIPLIER_MIN = 0.95;
export const ITRA_GLOBAL_MULTIPLIER_MAX = 1.05;
export const ITRA_GLOBAL_MULTIPLIER_NEUTRAL = 1;
export const WEATHER_GLOBAL_MULTIPLIER_NEUTRAL = 1;

export type DifficultyLabel = (typeof ESTIMATION_DIFFICULTY_LABELS)[number];
export type ExternalSignalStatus = (typeof EXTERNAL_SIGNAL_STATUSES)[number];

export interface EstimationProfileInput {
  experienceLevel: string;
  weightKg: number;
  weeklyDistanceKm: number;
  updatedAt: string;
}

export interface ItraSignalResolution {
  status: ExternalSignalStatus;
  source: "itra";
  rawScore: number | null;
  globalTimeMultiplier: number;
  message: string | null;
  asOf: string | null;
}

export interface WeatherSignalResolution {
  status: ExternalSignalStatus;
  source: "open-meteo";
  meanTemperatureC: number | null;
  globalTimeMultiplier: number;
  message: string | null;
  asOf: string | null;
}

export interface ExternalSignalResolution {
  itra: ItraSignalResolution;
  weather: WeatherSignalResolution;
}

export interface EstimationDerivedMetrics {
  averageSlopePercent: number | null;
  elevationPerKmM: number | null;
  averagePaceMinPerKm?: number | null;
  profileAdjustmentFactor: number;
  effortScore: number;
  externalSignals?: ExternalSignalResolution;
  globalTimeMultiplierApplied?: number;
}

export interface RouteEstimationInput {
  userId: string;
  routeSnapshot: RouteSnapshot;
  profile: EstimationProfileInput;
  externalSignals?: ExternalSignalResolution;
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
  historyVersion: number;
  recomputedFromHistoryId: number | null;
  isLegacy: boolean;
  sourceFileName: string | null;
  totalDistanceM: number | null;
  elevationGainM: number | null;
  plannedRunAt: string | null;
  plannedRunTimezoneOffsetMinutes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RouteEstimationHistoryRow {
  id: number;
  user_id: string;
  route_hash: string;
  profile_signature: string;
  history_version: number;
  recomputed_from_history_id: number | null;
  is_legacy: boolean;
  source_file_name: string | null;
  total_distance_m: number | null;
  elevation_gain_m: number | null;
  planned_run_at: string | null;
  planned_run_timezone_offset_minutes: number | null;
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
  plannedRunAt: string | null;
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
  planned_run_at: string | null;
  uploaded_at: string;
  last_estimated_at: string;
  created_at: string;
  updated_at: string;
}

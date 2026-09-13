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

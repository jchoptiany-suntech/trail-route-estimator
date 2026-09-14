import {
  ITRA_GLOBAL_MULTIPLIER_MAX,
  ITRA_GLOBAL_MULTIPLIER_MIN,
  ITRA_GLOBAL_MULTIPLIER_NEUTRAL,
  WEATHER_GLOBAL_MULTIPLIER_NEUTRAL,
} from "@/lib/estimation/types";
import type {
  DifficultyLabel,
  EstimationProfileInput,
  RouteEstimationComputation,
  RouteEstimationInput,
} from "@/lib/estimation/types";
import type { GpxPoint } from "@/lib/route/types";

export type EstimationErrorCode = "invalid_profile" | "invalid_route";

export class EstimationError extends Error {
  code: EstimationErrorCode;

  constructor(code: EstimationErrorCode, message: string) {
    super(message);
    this.name = "EstimationError";
    this.code = code;
  }
}

function estimateDistanceKm(totalDistanceM: number): number {
  return totalDistanceM / 1000;
}

function assertValidProfile(profile: EstimationProfileInput): void {
  if (!profile.experienceLevel.trim()) {
    throw new EstimationError("invalid_profile", "Experience level is required for personalized estimation.");
  }
  if (!Number.isFinite(profile.weightKg) || profile.weightKg <= 0) {
    throw new EstimationError("invalid_profile", "Weight must be a positive value.");
  }
  if (!Number.isFinite(profile.weeklyDistanceKm) || profile.weeklyDistanceKm <= 0) {
    throw new EstimationError("invalid_profile", "Weekly distance must be a positive value.");
  }
}

function assertValidRoute(input: RouteEstimationInput): void {
  if (input.routeSnapshot.pointCount < 2 || input.routeSnapshot.geometry.length < 2) {
    throw new EstimationError("invalid_route", "Route must contain at least two points.");
  }
  if (!Number.isFinite(input.routeSnapshot.totalDistanceM) || input.routeSnapshot.totalDistanceM <= 0) {
    throw new EstimationError("invalid_route", "Route distance must be positive.");
  }
}

function haversineDistanceM(start: GpxPoint, end: GpxPoint): number {
  const earthRadiusM = 6371000;
  const dLat = ((end.lat - start.lat) * Math.PI) / 180;
  const dLng = ((end.lng - start.lng) * Math.PI) / 180;
  const lat1 = (start.lat * Math.PI) / 180;
  const lat2 = (end.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusM * c;
}

function computeAverageSlopePercent(geometry: GpxPoint[]): number | null {
  let horizontalDistanceM = 0;
  let verticalGainM = 0;

  for (let i = 1; i < geometry.length; i += 1) {
    const previous = geometry[i - 1];
    const current = geometry[i];
    horizontalDistanceM += haversineDistanceM(previous, current);

    if (previous.eleM !== null && current.eleM !== null) {
      const delta = current.eleM - previous.eleM;
      if (delta > 0) {
        verticalGainM += delta;
      }
    }
  }

  if (horizontalDistanceM <= 0) {
    return null;
  }

  return (verticalGainM / horizontalDistanceM) * 100;
}

function normalizeExperienceLevel(level: string): string {
  return level.trim().toLowerCase();
}

function resolveExperiencePaceMinutesPerKm(level: string): number {
  const normalized = normalizeExperienceLevel(level);

  if (normalized.includes("beginner")) {
    return 8.5;
  }
  if (normalized.includes("intermediate")) {
    return 7.25;
  }
  if (normalized.includes("advanced")) {
    return 6.2;
  }

  return 7.75;
}

function resolveProfileAdjustmentFactor(profile: EstimationProfileInput): number {
  const weeklyDistanceFactor = Math.max(0.8, Math.min(1.2, 1.05 - profile.weeklyDistanceKm / 200));
  const weightFactor = Math.max(0.9, Math.min(1.15, 0.97 + (profile.weightKg - 70) / 350));

  return weeklyDistanceFactor * weightFactor;
}

function resolveDifficulty(effortScore: number): DifficultyLabel {
  if (effortScore < 60) {
    return "easy";
  }
  if (effortScore < 120) {
    return "medium";
  }
  return "hard";
}

function clampItraMultiplier(multiplier: number): number {
  return Math.max(ITRA_GLOBAL_MULTIPLIER_MIN, Math.min(ITRA_GLOBAL_MULTIPLIER_MAX, multiplier));
}

function resolveItraMultiplier(input: RouteEstimationInput): number {
  const value = input.externalSignals?.itra.globalTimeMultiplier ?? ITRA_GLOBAL_MULTIPLIER_NEUTRAL;
  return clampItraMultiplier(value);
}

function resolveWeatherMultiplier(input: RouteEstimationInput): number {
  if (input.externalSignals?.weather.status !== "available") {
    return WEATHER_GLOBAL_MULTIPLIER_NEUTRAL;
  }

  return input.externalSignals.weather.globalTimeMultiplier;
}

export function computeRouteEstimation(input: RouteEstimationInput): RouteEstimationComputation {
  assertValidProfile(input.profile);
  assertValidRoute(input);

  const distanceKm = estimateDistanceKm(input.routeSnapshot.totalDistanceM);
  const elevationGainM = input.routeSnapshot.elevationGainM ?? 0;
  const elevationPerKmM = distanceKm > 0 ? elevationGainM / distanceKm : null;
  const averageSlopePercent = computeAverageSlopePercent(input.routeSnapshot.geometry);
  const basePaceMinutesPerKm = resolveExperiencePaceMinutesPerKm(input.profile.experienceLevel);
  const profileAdjustmentFactor = resolveProfileAdjustmentFactor(input.profile);
  const itraMultiplier = resolveItraMultiplier(input);
  const weatherMultiplier = resolveWeatherMultiplier(input);
  const globalTimeMultiplierApplied = itraMultiplier * weatherMultiplier;

  const slopePenalty = averageSlopePercent !== null ? 1 + averageSlopePercent / 10 : 1;
  const elevationPenalty = 1 + elevationGainM / 3000;
  const estimatedTimeMinutes = Math.max(
    1,
    Math.round(
      distanceKm *
        basePaceMinutesPerKm *
        profileAdjustmentFactor *
        slopePenalty *
        elevationPenalty *
        globalTimeMultiplierApplied,
    ),
  );

  const effortScore = distanceKm * 5 + elevationGainM / 30 + (averageSlopePercent ?? 0) * 2;
  const averagePaceMinPerKm = distanceKm > 0 ? estimatedTimeMinutes / distanceKm : null;

  return {
    estimatedTimeMinutes,
    difficulty: resolveDifficulty(effortScore),
    derivedMetrics: {
      averageSlopePercent,
      elevationPerKmM,
      averagePaceMinPerKm,
      profileAdjustmentFactor,
      effortScore,
      externalSignals: input.externalSignals,
      globalTimeMultiplierApplied,
    },
    computedAt: new Date().toISOString(),
  };
}

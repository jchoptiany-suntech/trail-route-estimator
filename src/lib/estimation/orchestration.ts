import { computeRouteEstimation } from "@/lib/estimation/engine";
import {
  createRouteEstimationError,
  mapRouteEstimationError,
  type RouteEstimationError,
} from "@/lib/estimation/error-mapping";
import { buildRouteEstimationDeduplicationKey } from "@/lib/estimation/history-signature";
import {
  getRouteEstimationForUser,
  persistRouteEstimationBundle,
  upsertRouteEstimationForUser,
} from "@/lib/estimation/service";
import {
  ITRA_GLOBAL_MULTIPLIER_NEUTRAL,
  ITRA_GLOBAL_MULTIPLIER_MAX,
  ITRA_GLOBAL_MULTIPLIER_MIN,
  WEATHER_GLOBAL_MULTIPLIER_NEUTRAL,
  type ExternalSignalResolution,
  type RouteEstimationSnapshot,
} from "@/lib/estimation/types";
import { fetchWeatherAtRunTime } from "@/lib/estimation/weather-provider";
import { isProfileComplete, type SportProfile } from "@/lib/profile/service";
import type { RouteSnapshot } from "@/lib/route/types";
import type { SupabaseClient } from "@supabase/supabase-js";

interface RecomputeInput {
  supabase: SupabaseClient;
  userId: string;
  snapshot: RouteSnapshot | null;
  profile: SportProfile | null;
  weatherProviderError?: Error | null;
}

export interface RecomputeSuccess {
  ok: true;
  estimation: RouteEstimationSnapshot;
  warnings: string[];
}

export interface RecomputeSkipped {
  ok: false;
  skipped: true;
  reason: "missing_snapshot" | "incomplete_profile";
}

export interface RecomputeFailure {
  ok: false;
  skipped?: false;
  error: RouteEstimationError;
}

export type RecomputeResult = RecomputeSuccess | RecomputeSkipped | RecomputeFailure;

interface ExternalSignalResolutionResult {
  externalSignals: ExternalSignalResolution;
  warnings: string[];
}

function isHistoryOnlyBundleFailure(error: Error): boolean {
  const haystack = `${error.name} ${error.message}`.toLowerCase();
  return haystack.includes("route_estimation_history") || haystack.includes("saved_route_history");
}

function resolveItraSignal(itraIndex: number | null): ExternalSignalResolutionResult["externalSignals"]["itra"] {
  if (itraIndex === null) {
    const warning = "ITRA index is unavailable, so a neutral runner factor was applied.";
    return {
      status: "missing",
      source: "itra",
      rawScore: null,
      globalTimeMultiplier: ITRA_GLOBAL_MULTIPLIER_NEUTRAL,
      message: warning,
      asOf: null,
    };
  }

  const normalized = Math.max(0, Math.min(1000, itraIndex));
  const centered = (500 - normalized) / 500;
  const multiplier = Math.max(
    ITRA_GLOBAL_MULTIPLIER_MIN,
    Math.min(ITRA_GLOBAL_MULTIPLIER_MAX, ITRA_GLOBAL_MULTIPLIER_NEUTRAL + centered * 0.05),
  );

  return {
    status: "available",
    source: "itra",
    rawScore: itraIndex,
    globalTimeMultiplier: multiplier,
    message: null,
    asOf: null,
  };
}

async function resolveWeatherSignal(
  snapshot: RouteSnapshot,
  weatherProviderError?: Error | null,
): Promise<ExternalSignalResolutionResult["externalSignals"]["weather"]> {
  if (!snapshot.plannedRunAt) {
    return {
      status: "not_applicable",
      source: "open-meteo",
      meanTemperatureC: null,
      globalTimeMultiplier: WEATHER_GLOBAL_MULTIPLIER_NEUTRAL,
      message: "Weather impact was skipped because no run datetime was provided.",
      asOf: null,
    };
  }

  if (weatherProviderError) {
    return {
      status: "provider_error",
      source: "open-meteo",
      meanTemperatureC: null,
      globalTimeMultiplier: WEATHER_GLOBAL_MULTIPLIER_NEUTRAL,
      message: "Weather provider is unavailable, so a neutral weather factor was applied.",
      asOf: null,
    };
  }

  try {
    const weather = await fetchWeatherAtRunTime(snapshot.startLat, snapshot.startLng, snapshot.plannedRunAt);
    return {
      status: "available",
      source: "open-meteo",
      meanTemperatureC: weather.temperatureC,
      globalTimeMultiplier: weather.globalTimeMultiplier,
      message: null,
      asOf: weather.asOf,
    };
  } catch {
    return {
      status: "provider_error",
      source: "open-meteo",
      meanTemperatureC: null,
      globalTimeMultiplier: WEATHER_GLOBAL_MULTIPLIER_NEUTRAL,
      message: "Weather provider is unavailable, so a neutral weather factor was applied.",
      asOf: null,
    };
  }
}

async function resolveExternalSignals(
  snapshot: RouteSnapshot,
  itraIndex: number | null,
  weatherProviderError?: Error | null,
): Promise<ExternalSignalResolutionResult> {
  const itra = resolveItraSignal(itraIndex);
  const weather = await resolveWeatherSignal(snapshot, weatherProviderError);
  const warnings: string[] = [];

  if (itra.message) {
    warnings.push(itra.message);
  }
  if (weather.status === "provider_error" && weather.message) {
    warnings.push(weather.message);
  }

  return {
    externalSignals: { itra, weather },
    warnings,
  };
}

export async function recomputeLatestEstimation(input: RecomputeInput): Promise<RecomputeResult> {
  if (!input.snapshot) {
    return { ok: false, skipped: true, reason: "missing_snapshot" };
  }

  if (
    !input.profile ||
    !isProfileComplete(input.profile) ||
    input.profile.status !== "complete" ||
    input.profile.experienceLevel === null ||
    input.profile.weightKg === null ||
    input.profile.weeklyDistanceKm === null
  ) {
    return { ok: false, skipped: true, reason: "incomplete_profile" };
  }

  try {
    const externalSignalResolution = await resolveExternalSignals(
      input.snapshot,
      input.profile.itraIndex,
      input.weatherProviderError,
    );

    const computed = computeRouteEstimation({
      userId: input.userId,
      routeSnapshot: input.snapshot,
      profile: {
        experienceLevel: input.profile.experienceLevel,
        weightKg: input.profile.weightKg,
        weeklyDistanceKm: input.profile.weeklyDistanceKm,
        updatedAt: input.profile.updatedAt,
      },
      externalSignals: externalSignalResolution.externalSignals,
    });

    const deduplicationKey = await buildRouteEstimationDeduplicationKey(input.snapshot, {
      experienceLevel: input.profile.experienceLevel,
      weightKg: input.profile.weightKg,
      weeklyDistanceKm: input.profile.weeklyDistanceKm,
      updatedAt: input.profile.updatedAt,
    });

    const persistedBundle = await persistRouteEstimationBundle(
      input.supabase,
      input.userId,
      deduplicationKey,
      computed,
      {
        sourceUploadedAt: input.snapshot.uploadedAt,
        profileUpdatedAt: input.profile.updatedAt,
      },
      input.snapshot,
    );

    if (persistedBundle.error && isHistoryOnlyBundleFailure(persistedBundle.error)) {
      const fallbackLatest = await upsertRouteEstimationForUser(input.supabase, input.userId, computed, {
        sourceUploadedAt: input.snapshot.uploadedAt,
        profileUpdatedAt: input.profile.updatedAt,
      });

      if (fallbackLatest.error || !fallbackLatest.data) {
        return {
          ok: false,
          error: {
            code: "storage_failure",
            message: "Unable to save estimation right now. Please try again.",
          },
        };
      }

      return {
        ok: true,
        estimation: fallbackLatest.data,
        warnings: [...externalSignalResolution.warnings, createRouteEstimationError("history_storage_failure").message],
      };
    }

    if (persistedBundle.error) {
      return {
        ok: false,
        error: {
          code: "storage_failure",
          message: "Unable to save estimation right now. Please try again.",
        },
      };
    }

    const persistedEstimation = await getRouteEstimationForUser(input.supabase, input.userId);
    if (persistedEstimation.error || !persistedEstimation.data) {
      return {
        ok: false,
        error: {
          code: "storage_failure",
          message: "Unable to load updated estimation right now. Please try again.",
        },
      };
    }

    return { ok: true, estimation: persistedEstimation.data, warnings: externalSignalResolution.warnings };
  } catch (error) {
    return { ok: false, error: mapRouteEstimationError(error) };
  }
}

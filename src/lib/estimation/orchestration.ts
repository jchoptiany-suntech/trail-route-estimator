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
  WEATHER_GLOBAL_MULTIPLIER_NEUTRAL,
  type ExternalSignalResolution,
  type RouteEstimationSnapshot,
} from "@/lib/estimation/types";
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

function resolveExternalSignals(weatherProviderError?: Error | null): ExternalSignalResolutionResult {
  const warning = "ITRA index is unavailable, so a neutral runner factor was applied.";
  const weatherWarning = weatherProviderError
    ? "Weather provider is unavailable, so a neutral weather factor was applied."
    : "Weather impact was skipped because no run datetime was provided.";

  return {
    externalSignals: {
      itra: {
        status: "missing",
        source: "itra",
        rawScore: null,
        globalTimeMultiplier: ITRA_GLOBAL_MULTIPLIER_NEUTRAL,
        message: warning,
        asOf: null,
      },
      weather: {
        status: weatherProviderError ? "provider_error" : "not_applicable",
        source: "open-meteo",
        meanTemperatureC: null,
        globalTimeMultiplier: WEATHER_GLOBAL_MULTIPLIER_NEUTRAL,
        message: weatherWarning,
        asOf: null,
      },
    },
    warnings: weatherProviderError ? [warning, weatherWarning] : [warning],
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
    const externalSignalResolution = resolveExternalSignals(input.weatherProviderError);

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

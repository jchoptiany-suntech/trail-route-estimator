import { computeRouteEstimation } from "@/lib/estimation/engine";
import { mapRouteEstimationError, type RouteEstimationError } from "@/lib/estimation/error-mapping";
import { buildRouteEstimationDeduplicationKey } from "@/lib/estimation/history-signature";
import { getRouteEstimationForUser, persistRouteEstimationBundle } from "@/lib/estimation/service";
import type { RouteEstimationSnapshot } from "@/lib/estimation/types";
import { isProfileComplete, type SportProfile } from "@/lib/profile/service";
import type { RouteSnapshot } from "@/lib/route/types";
import type { SupabaseClient } from "@supabase/supabase-js";

interface RecomputeInput {
  supabase: SupabaseClient;
  userId: string;
  snapshot: RouteSnapshot | null;
  profile: SportProfile | null;
}

export interface RecomputeSuccess {
  ok: true;
  estimation: RouteEstimationSnapshot;
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
    const computed = computeRouteEstimation({
      userId: input.userId,
      routeSnapshot: input.snapshot,
      profile: {
        experienceLevel: input.profile.experienceLevel,
        weightKg: input.profile.weightKg,
        weeklyDistanceKm: input.profile.weeklyDistanceKm,
        updatedAt: input.profile.updatedAt,
      },
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

    return { ok: true, estimation: persistedEstimation.data };
  } catch (error) {
    return { ok: false, error: mapRouteEstimationError(error) };
  }
}

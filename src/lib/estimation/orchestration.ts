import { computeRouteEstimation } from "@/lib/estimation/engine";
import { buildRouteEstimationDeduplicationKey } from "@/lib/estimation/history-signature";
import { mapRouteEstimationError, type RouteEstimationError } from "@/lib/estimation/error-mapping";
import { upsertRouteEstimationForUser, upsertRouteEstimationHistoryEntryForUser } from "@/lib/estimation/service";
import type { RouteEstimationSnapshot } from "@/lib/estimation/types";
import { isProfileComplete, type SportProfile } from "@/lib/profile/service";
import { upsertSavedRouteHistoryForUser } from "@/lib/route/service";
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
  partial?: false;
  error: RouteEstimationError;
}

export interface RecomputePartialFailure {
  ok: false;
  skipped?: false;
  partial: true;
  stage: "estimation_history" | "saved_route_history";
  error: RouteEstimationError;
}

export type RecomputeResult = RecomputeSuccess | RecomputeSkipped | RecomputeFailure | RecomputePartialFailure;

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

    const persisted = await upsertRouteEstimationForUser(input.supabase, input.userId, computed, {
      sourceUploadedAt: input.snapshot.uploadedAt,
      profileUpdatedAt: input.profile.updatedAt,
    });

    if (persisted.error || !persisted.data) {
      return {
        ok: false,
        error: {
          code: "storage_failure",
          message: "Unable to save estimation right now. Please try again.",
        },
      };
    }

    const deduplicationKey = await buildRouteEstimationDeduplicationKey(input.snapshot, {
      experienceLevel: input.profile.experienceLevel,
      weightKg: input.profile.weightKg,
      weeklyDistanceKm: input.profile.weeklyDistanceKm,
      updatedAt: input.profile.updatedAt,
    });

    const historyEntry = await upsertRouteEstimationHistoryEntryForUser(
      input.supabase,
      input.userId,
      deduplicationKey,
      computed,
      {
        sourceUploadedAt: input.snapshot.uploadedAt,
        profileUpdatedAt: input.profile.updatedAt,
      },
    );

    if (historyEntry.error || !historyEntry.data) {
      return {
        ok: false,
        partial: true,
        stage: "estimation_history",
        error: {
          code: "history_storage_failure",
          message: "Latest estimation was updated, but history could not be saved right now.",
        },
      };
    }

    const savedRouteHistory = await upsertSavedRouteHistoryForUser(
      input.supabase,
      input.userId,
      deduplicationKey.routeHash,
      input.snapshot,
      computed.computedAt,
    );

    if (savedRouteHistory.error || !savedRouteHistory.data) {
      return {
        ok: false,
        partial: true,
        stage: "saved_route_history",
        error: {
          code: "history_storage_failure",
          message: "Latest estimation was updated, but history could not be saved right now.",
        },
      };
    }

    return { ok: true, estimation: persisted.data };
  } catch (error) {
    return { ok: false, error: mapRouteEstimationError(error) };
  }
}

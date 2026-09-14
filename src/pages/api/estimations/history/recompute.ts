import type { APIRoute } from "astro";
import { buildRouteHash } from "@/lib/estimation/history-signature";
import { recomputeLatestEstimation } from "@/lib/estimation/orchestration";
import { resolveUploadRecomputeWarning } from "@/lib/estimation/recompute-feedback";
import { getRouteEstimationHistoryEntryForUser } from "@/lib/estimation/service";
import { getProfileForUser } from "@/lib/profile/service";
import { getRouteSnapshotForUser } from "@/lib/route/service";
import { createClient } from "@/lib/supabase";

function dashboardWarningRedirect(message: string): string {
  const params = new URLSearchParams();
  params.set("warning", message);
  return `/dashboard?${params.toString()}`;
}

function dashboardErrorRedirect(message: string): string {
  const params = new URLSearchParams();
  params.set("error", message);
  return `/dashboard?${params.toString()}`;
}

function parseHistoryEntryId(formData: FormData): number | null {
  const raw = formData.get("historyEntryId");
  if (typeof raw !== "string" || raw.trim() === "") {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(dashboardErrorRedirect("Supabase is not configured."));
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return context.redirect("/auth/signin");
  }

  const formData = await context.request.formData();
  const historyEntryId = parseHistoryEntryId(formData);
  if (historyEntryId === null) {
    return context.redirect(dashboardErrorRedirect("Invalid history entry."));
  }

  const historyEntryResult = await getRouteEstimationHistoryEntryForUser(supabase, user.id, historyEntryId);
  if (historyEntryResult.error || !historyEntryResult.data) {
    return context.redirect(dashboardErrorRedirect("Unable to load selected history entry."));
  }

  const snapshotResult = await getRouteSnapshotForUser(supabase, user.id);
  if (snapshotResult.error || !snapshotResult.data) {
    return context.redirect(dashboardErrorRedirect("Upload the route again before recomputing this history entry."));
  }
  const snapshot = snapshotResult.data;

  const currentRouteHash = await buildRouteHash(snapshot);
  if (currentRouteHash !== historyEntryResult.data.deduplicationKey.routeHash) {
    return context.redirect(
      dashboardErrorRedirect("Recompute is available only for the currently uploaded route context."),
    );
  }

  const profileResult = await getProfileForUser(supabase, user.id);
  if (profileResult.error) {
    return context.redirect(dashboardErrorRedirect("Unable to load your profile for recompute."));
  }

  const recomputeResult = await recomputeLatestEstimation({
    supabase,
    userId: user.id,
    snapshot,
    profile: profileResult.data,
    recomputedFromHistoryId: historyEntryResult.data.id,
    forceNewHistoryVersion: true,
  });

  if (!recomputeResult.ok && !recomputeResult.skipped) {
    return context.redirect(dashboardErrorRedirect(recomputeResult.error.message));
  }

  if (!recomputeResult.ok) {
    return context.redirect(
      dashboardWarningRedirect("Recompute skipped because profile or route context is incomplete."),
    );
  }

  const warning = resolveUploadRecomputeWarning(recomputeResult);
  if (warning) {
    return context.redirect(dashboardWarningRedirect(warning));
  }

  return context.redirect("/dashboard");
};

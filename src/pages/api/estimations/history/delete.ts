import type { APIRoute } from "astro";
import { buildRouteHash } from "@/lib/estimation/history-signature";
import {
  deleteRouteEstimationHistoryEntryForUser,
  getRouteEstimationHistoryEntryForUser,
} from "@/lib/estimation/service";
import { getRouteSnapshotForUser } from "@/lib/route/service";
import { createClient } from "@/lib/supabase";

function dashboardErrorRedirect(message: string): string {
  const params = new URLSearchParams();
  params.set("error", message);
  return `/dashboard?${params.toString()}`;
}

function dashboardSuccessRedirect(message: string): string {
  const params = new URLSearchParams();
  params.set("success", message);
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
  if (!snapshotResult.error && snapshotResult.data) {
    const currentRouteHash = await buildRouteHash(snapshotResult.data);
    if (currentRouteHash === historyEntryResult.data.deduplicationKey.routeHash) {
      return context.redirect(
        dashboardErrorRedirect("You cannot delete history for the currently uploaded route context."),
      );
    }
  }

  const deleteResult = await deleteRouteEstimationHistoryEntryForUser(supabase, user.id, historyEntryId);
  if (deleteResult.error || !deleteResult.deleted) {
    return context.redirect(dashboardErrorRedirect("Unable to delete selected history entry."));
  }

  return context.redirect(dashboardSuccessRedirect("History entry deleted."));
};

import type { APIRoute } from "astro";
import { buildAuthErrorRedirect, createAuthFormError } from "@/lib/auth/error-mapping";
import { recomputeLatestEstimation } from "@/lib/estimation/orchestration";
import {
  getProfileForUser,
  isProfileComplete,
  upsertProfileForUser,
  type ProfileDraftInput,
  type ProfileStatus,
} from "@/lib/profile/service";
import { getRouteSnapshotForUser } from "@/lib/route/service";
import { createClient } from "@/lib/supabase";

type ProfileAction = "saveDraft" | "saveComplete";

function parseAction(formData: FormData): ProfileAction {
  const value = formData.get("action");
  return value === "saveComplete" ? "saveComplete" : "saveDraft";
}

function parseOptionalNumber(formData: FormData, field: string): number | null {
  const value = formData.get(field);
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDraftInput(formData: FormData): ProfileDraftInput {
  const experienceValue = formData.get("experienceLevel");

  return {
    experienceLevel:
      typeof experienceValue === "string" && experienceValue.trim() !== "" ? experienceValue.trim() : null,
    weightKg: parseOptionalNumber(formData, "weightKg"),
    weeklyDistanceKm: parseOptionalNumber(formData, "weeklyDistanceKm"),
  };
}

function profileErrorRedirect(message: string): string {
  const params = new URLSearchParams();
  params.set("error", message);
  return `/profile?${params.toString()}`;
}

function profileSuccessRedirect(message: string): string {
  const params = new URLSearchParams();
  params.set("success", message);
  return `/profile?${params.toString()}`;
}

function dashboardWarningRedirect(message: string): string {
  const params = new URLSearchParams();
  params.set("warning", message);
  return `/dashboard?${params.toString()}`;
}

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(buildAuthErrorRedirect("/auth/signin", createAuthFormError("supabase_not_configured")));
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return context.redirect(buildAuthErrorRedirect("/auth/signin", createAuthFormError("invalid_credentials")));
  }

  const form = await context.request.formData();
  const action = parseAction(form);
  const input = parseDraftInput(form);
  const targetStatus: ProfileStatus = action === "saveComplete" ? "complete" : "draft";

  if (targetStatus === "complete" && !isProfileComplete(input)) {
    return context.redirect(profileErrorRedirect("Please complete all required profile fields."));
  }

  const current = await getProfileForUser(supabase, user.id);
  if (current.error) {
    return context.redirect(profileErrorRedirect("Unable to load current profile. Please try again."));
  }

  if (current.data?.status === "complete" && targetStatus === "draft") {
    return context.redirect(profileErrorRedirect("Completed profile cannot be reverted to draft."));
  }

  const { data, error } = await upsertProfileForUser(supabase, user.id, input, targetStatus);
  if (error || !data) {
    return context.redirect(profileErrorRedirect("Unable to save profile right now. Please try again."));
  }

  if (data.status === "complete") {
    const snapshotResult = await getRouteSnapshotForUser(supabase, user.id);
    if (snapshotResult.error) {
      return context.redirect(dashboardWarningRedirect("Profile saved, but estimation was not refreshed."));
    }

    const recompute = await recomputeLatestEstimation({
      supabase,
      userId: user.id,
      snapshot: snapshotResult.data,
      profile: data,
    });

    if (!recompute.ok && !recompute.skipped) {
      return context.redirect(dashboardWarningRedirect(`Profile saved, but ${recompute.error.message.toLowerCase()}`));
    }

    return context.redirect("/dashboard");
  }

  return context.redirect(profileSuccessRedirect("Profile draft saved."));
};

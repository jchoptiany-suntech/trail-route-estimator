import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileStatus = "draft" | "complete";

export interface ProfileDraftInput {
  experienceLevel: string | null;
  weightKg: number | null;
  weeklyDistanceKm: number | null;
  itraIndex: number | null;
}

export interface SportProfile extends ProfileDraftInput {
  userId: string;
  status: ProfileStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProfileRow {
  user_id: string;
  experience_level: string | null;
  weight_kg: number | null;
  weekly_distance_km: number | null;
  itra_index: number | null;
  status: ProfileStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function isProfileComplete(input: ProfileDraftInput): boolean {
  return Boolean(
    input.experienceLevel &&
    input.experienceLevel.trim().length > 0 &&
    typeof input.weightKg === "number" &&
    Number.isFinite(input.weightKg) &&
    input.weightKg > 0 &&
    typeof input.weeklyDistanceKm === "number" &&
    Number.isFinite(input.weeklyDistanceKm) &&
    input.weeklyDistanceKm > 0,
  );
}

function mapRowToProfile(row: ProfileRow): SportProfile {
  return {
    userId: row.user_id,
    experienceLevel: row.experience_level,
    weightKg: row.weight_kg,
    weeklyDistanceKm: row.weekly_distance_km,
    itraIndex: row.itra_index,
    status: row.status,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProfileForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: SportProfile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "user_id, experience_level, weight_kg, weekly_distance_km, itra_index, status, completed_at, created_at, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return { data: mapRowToProfile(data), error: null };
}

export async function upsertProfileForUser(
  supabase: SupabaseClient,
  userId: string,
  input: ProfileDraftInput,
  targetStatus: ProfileStatus,
): Promise<{ data: SportProfile | null; error: Error | null }> {
  const complete = isProfileComplete(input);
  const status: ProfileStatus = targetStatus === "complete" && complete ? "complete" : "draft";

  const payload = {
    user_id: userId,
    experience_level: input.experienceLevel,
    weight_kg: input.weightKg,
    weekly_distance_km: input.weeklyDistanceKm,
    itra_index: input.itraIndex,
    status,
    completed_at: status === "complete" ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select(
      "user_id, experience_level, weight_kg, weekly_distance_km, itra_index, status, completed_at, created_at, updated_at",
    )
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: mapRowToProfile(data), error: null };
}

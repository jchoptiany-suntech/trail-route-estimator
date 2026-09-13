declare namespace App {
  interface SportProfile {
    experienceLevel: string | null;
    weightKg: number | null;
    weeklyDistanceKm: number | null;
    status: "draft" | "complete";
  }

  interface Locals {
    user: import("@supabase/supabase-js").User | null;
    profile: SportProfile | null;
    profileComplete: boolean;
  }
}

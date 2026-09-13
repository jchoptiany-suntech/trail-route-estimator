import type { RecomputeResult } from "@/lib/estimation/orchestration";

export function resolveUploadRecomputeWarning(result: RecomputeResult): string | null {
  if (!result.ok && !result.skipped) {
    return result.error.message;
  }

  return null;
}

export function resolveProfileRecomputeWarning(result: RecomputeResult): string | null {
  if (!result.ok && !result.skipped) {
    return `Profile saved, but ${result.error.message.toLowerCase()}`;
  }

  return null;
}

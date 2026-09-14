import type { RecomputeResult } from "@/lib/estimation/orchestration";

export function resolveUploadRecomputeWarning(result: RecomputeResult): string | null {
  if (!result.ok && !result.skipped) {
    return result.error.message;
  }

  if (result.ok && result.warnings.length > 0) {
    return result.warnings.join(" ");
  }

  return null;
}

export function resolveProfileRecomputeWarning(result: RecomputeResult): string | null {
  if (!result.ok && !result.skipped) {
    return `Profile saved, but ${result.error.message.toLowerCase()}`;
  }

  if (result.ok && result.warnings.length > 0) {
    return `Profile saved, but ${result.warnings.join(" ").toLowerCase()}`;
  }

  return null;
}

import { execSync } from "node:child_process";
import assert from "node:assert/strict";
import { unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import test from "node:test";

function runCriticalPathContinuityProbe() {
  const scriptPath = join(process.cwd(), ".tmp-critical-path-continuity-probe.ts");
  const script = `
import { createRouteEstimationError } from "./src/lib/estimation/error-mapping.ts";
import { buildRouteEstimationDeduplicationKey } from "./src/lib/estimation/history-signature.ts";
import { resolveUploadRecomputeWarning } from "./src/lib/estimation/recompute-feedback.ts";
import { getNextRouteEstimationHistoryVersion } from "./src/lib/estimation/service.ts";

const snapshotBase = {
  userId: "user-1",
  sourceFileName: "route.gpx",
  sourceFileSizeBytes: 4200,
  pointCount: 3,
  totalDistanceM: 5100,
  elevationGainM: 380,
  elevationLossM: 360,
  minElevationM: 900,
  maxElevationM: 1280,
  startLat: 49.2,
  startLng: 20.1,
  endLat: 49.25,
  endLng: 20.15,
  bounds: { minLat: 49.2, minLng: 20.1, maxLat: 49.25, maxLng: 20.15 },
  plannedRunAt: "2026-09-20T05:30:00.000Z",
  plannedRunTimezoneOffsetMinutes: -120,
  geometry: [
    { lat: 49.2, lng: 20.1, eleM: 900 },
    { lat: 49.23, lng: 20.13, eleM: 1120 },
    { lat: 49.25, lng: 20.15, eleM: 1280 },
  ],
  uploadedAt: "2026-09-14T10:00:00.000Z",
  createdAt: "2026-09-14T10:00:00.000Z",
  updatedAt: "2026-09-14T10:00:00.000Z",
};

const profileBase = {
  experienceLevel: "intermediate",
  weightKg: 72,
  weeklyDistanceKm: 35,
  updatedAt: "2026-09-14T10:00:00.000Z",
};

const profileChanged = {
  ...profileBase,
  weeklyDistanceKm: 42,
};

const snapshotDifferentRunTime = {
  ...snapshotBase,
  plannedRunAt: "2026-09-20T07:30:00.000Z",
};

const continuityWarning = createRouteEstimationError("history_storage_failure").message;
const success = { ok: true, estimation: {}, warnings: [] } as const;
const degraded = { ok: true, estimation: {}, warnings: [continuityWarning] } as const;
const skipped = { ok: false, skipped: true, reason: "incomplete_profile" } as const;
const failure = { ok: false, error: createRouteEstimationError("storage_failure") } as const;

const keyBase = await buildRouteEstimationDeduplicationKey(snapshotBase, profileBase);
const keyDifferentProfile = await buildRouteEstimationDeduplicationKey(snapshotBase, profileChanged);
const keyDifferentRouteContext = await buildRouteEstimationDeduplicationKey(snapshotDifferentRunTime, profileBase);

const maxVersionSupabase = {
  from() {
    return {
      select() {
        return {
          eq() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      order() {
                        return {
                          limit() {
                            return {
                              maybeSingle() {
                                return Promise.resolve({ data: { history_version: 7 }, error: null });
                              },
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    };
  },
};

const nextVersion = await getNextRouteEstimationHistoryVersion(maxVersionSupabase as any, "user-1", keyBase);

console.log(\`uploadFullSuccessWarning=\${resolveUploadRecomputeWarning(success as any) === null}\`);
console.log(\`uploadDegradedWarningExplicit=\${resolveUploadRecomputeWarning(degraded as any)}\`);
console.log(\`uploadSkippedWarning=\${resolveUploadRecomputeWarning(skipped as any) === null}\`);
console.log(\`uploadFailureWarning=\${resolveUploadRecomputeWarning(failure as any)}\`);
console.log(\`continuityMismatchByRoute=\${keyBase.routeHash !== keyDifferentRouteContext.routeHash}\`);
console.log(\`continuityMismatchByProfile=\${keyBase.profileSignature !== keyDifferentProfile.profileSignature}\`);
console.log(\`explicitRecomputeNextVersion=\${nextVersion.data}\`);
`;

  writeFileSync(scriptPath, script, "utf8");
  try {
    const command =
      process.platform === "win32" ? `npx.cmd --yes tsx "${scriptPath}"` : `npx --yes tsx "${scriptPath}"`;
    return execSync(command, { encoding: "utf8" });
  } finally {
    unlinkSync(scriptPath);
  }
}

void test("continuity matrix distinguishes full success from degraded history persistence", () => {
  const output = runCriticalPathContinuityProbe();
  assert.match(output, /uploadFullSuccessWarning=true/);
  assert.match(
    output,
    /uploadDegradedWarningExplicit=Latest estimation was updated, but history could not be saved right now\./,
  );
  assert.match(output, /uploadSkippedWarning=true/);
  assert.match(output, /uploadFailureWarning=Unable to save estimation right now. Please try again\./);
});

void test("continuity identity exposes mismatch dimensions", () => {
  const output = runCriticalPathContinuityProbe();
  assert.match(output, /continuityMismatchByRoute=true/);
  assert.match(output, /continuityMismatchByProfile=true/);
});

void test("explicit recompute versioning starts from next version", () => {
  const output = runCriticalPathContinuityProbe();
  assert.match(output, /explicitRecomputeNextVersion=8/);
});

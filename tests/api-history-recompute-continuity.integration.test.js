import { execSync } from "node:child_process";
import assert from "node:assert/strict";
import { unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import test from "node:test";

function runHistoryRecomputeContinuityProbe() {
  const scriptPath = join(process.cwd(), ".tmp-api-history-recompute-continuity-probe.ts");
  const script = `
import { createRouteEstimationError } from "./src/lib/estimation/error-mapping.ts";
import { buildRouteHash } from "./src/lib/estimation/history-signature.ts";
import { resolveUploadRecomputeWarning } from "./src/lib/estimation/recompute-feedback.ts";
import {
  getNextRouteEstimationHistoryVersion,
  insertRouteEstimationHistoryVersionForUser,
} from "./src/lib/estimation/service.ts";

function dashboardWarningRedirect(message: string): string {
  const params = new URLSearchParams();
  params.set("warning", message);
  return \`/dashboard?\${params.toString()}\`;
}

function dashboardErrorRedirect(message: string): string {
  const params = new URLSearchParams();
  params.set("error", message);
  return \`/dashboard?\${params.toString()}\`;
}

function parseHistoryEntryId(raw: string | null): number | null {
  if (typeof raw !== "string" || raw.trim() === "") {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

async function resolveHistoryRecomputeRedirect(input: {
  historyEntryIdRaw: string | null;
  historyEntryRouteHash: string;
  currentSnapshot: {
    pointCount: number;
    totalDistanceM: number;
    elevationGainM: number;
    elevationLossM: number;
    minElevationM: number;
    maxElevationM: number;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    bounds: { minLat: number; minLng: number; maxLat: number; maxLng: number };
    plannedRunAt: string;
  };
  recomputeResult:
    | { ok: true; estimation: Record<string, unknown>; warnings: string[] }
    | { ok: false; skipped: true; reason: "incomplete_profile" }
    | { ok: false; error: ReturnType<typeof createRouteEstimationError> };
}): Promise<string> {
  const historyEntryId = parseHistoryEntryId(input.historyEntryIdRaw);
  if (historyEntryId === null) {
    return dashboardErrorRedirect("Invalid history entry.");
  }

  const currentRouteHash = await buildRouteHash(input.currentSnapshot as any);
  if (currentRouteHash !== input.historyEntryRouteHash) {
    return dashboardErrorRedirect("Recompute is available only for the currently uploaded route context.");
  }

  if (!input.recomputeResult.ok && !input.recomputeResult.skipped) {
    return dashboardErrorRedirect(input.recomputeResult.error.message);
  }

  if (!input.recomputeResult.ok) {
    return dashboardWarningRedirect("Recompute skipped because profile or route context is incomplete.");
  }

  const warning = resolveUploadRecomputeWarning(input.recomputeResult as any);
  if (warning) {
    return dashboardWarningRedirect(warning);
  }

  return "/dashboard";
}

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
  status: "complete",
  itraIndex: 540,
};

const continuityWarning = createRouteEstimationError("history_storage_failure").message;
const routeHash = await buildRouteHash(snapshotBase);
const mismatchRouteHash = await buildRouteHash({ ...snapshotBase, plannedRunAt: "2026-09-20T07:30:00.000Z" });
const success = { ok: true, estimation: {}, warnings: [] } as const;
const degraded = { ok: true, estimation: {}, warnings: [continuityWarning] } as const;
const skipped = { ok: false, skipped: true, reason: "incomplete_profile" } as const;

const invalidIdRedirect = await resolveHistoryRecomputeRedirect({
  historyEntryIdRaw: "abc",
  historyEntryRouteHash: routeHash,
  currentSnapshot: snapshotBase,
  recomputeResult: success,
});
const mismatchRedirect = await resolveHistoryRecomputeRedirect({
  historyEntryIdRaw: "7",
  historyEntryRouteHash: routeHash,
  currentSnapshot: { ...snapshotBase, plannedRunAt: "2026-09-20T07:30:00.000Z" },
  recomputeResult: success,
});
const degradedRedirect = await resolveHistoryRecomputeRedirect({
  historyEntryIdRaw: "7",
  historyEntryRouteHash: routeHash,
  currentSnapshot: snapshotBase,
  recomputeResult: degraded,
});
const successRedirect = await resolveHistoryRecomputeRedirect({
  historyEntryIdRaw: "7",
  historyEntryRouteHash: routeHash,
  currentSnapshot: snapshotBase,
  recomputeResult: success,
});
const skippedRedirect = await resolveHistoryRecomputeRedirect({
  historyEntryIdRaw: "7",
  historyEntryRouteHash: routeHash,
  currentSnapshot: snapshotBase,
  recomputeResult: skipped,
});

let insertedHistoryVersion = -1;
let insertedRecomputedFromId: number | null = null;
const explicitRecomputeSupabase = {
  from(name: string) {
    if (name === "route_estimation_history") {
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
                                  return Promise.resolve({ data: { history_version: 4 }, error: null });
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
        insert(payload: any) {
          insertedHistoryVersion = payload.history_version;
          insertedRecomputedFromId = payload.recomputed_from_history_id ?? null;
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({
                    data: {
                      id: 99,
                      user_id: "user-1",
                      route_hash: routeHash,
                      profile_signature: "sig",
                      history_version: payload.history_version,
                      recomputed_from_history_id: payload.recomputed_from_history_id,
                      is_legacy: false,
                      source_file_name: snapshotBase.sourceFileName,
                      total_distance_m: snapshotBase.totalDistanceM,
                      elevation_gain_m: snapshotBase.elevationGainM,
                      planned_run_at: snapshotBase.plannedRunAt,
                      planned_run_timezone_offset_minutes: snapshotBase.plannedRunTimezoneOffsetMinutes,
                      estimated_time_minutes: 101,
                      difficulty: "medium",
                      average_slope_percent: 6.5,
                      effort_score: 4.2,
                      derived_metrics: {
                        averageSlopePercent: 6.5,
                        elevationPerKmM: 88,
                        profileAdjustmentFactor: 1,
                        effortScore: 4.2,
                      },
                      source_uploaded_at: snapshotBase.uploadedAt,
                      profile_updated_at: profileBase.updatedAt,
                      computed_at: "2026-09-14T12:00:00.000Z",
                      created_at: "2026-09-14T12:00:00.000Z",
                      updated_at: "2026-09-14T12:00:00.000Z",
                    },
                    error: null,
                  });
                },
              };
            },
          };
        },
      };
    }

    throw new Error(\`Unexpected table \${name}\`);
  },
};

const nextVersion = await getNextRouteEstimationHistoryVersion(
  explicitRecomputeSupabase as any,
  "user-1",
  { routeHash, profileSignature: "sig" },
);
await insertRouteEstimationHistoryVersionForUser(
  explicitRecomputeSupabase as any,
  "user-1",
  { routeHash, profileSignature: "sig" },
  {
    estimatedTimeMinutes: 101,
    difficulty: "medium",
    derivedMetrics: {
      averageSlopePercent: 6.5,
      elevationPerKmM: 88,
      profileAdjustmentFactor: 1,
      effortScore: 4.2,
    },
    computedAt: "2026-09-14T12:00:00.000Z",
  },
  {
    sourceUploadedAt: snapshotBase.uploadedAt,
    profileUpdatedAt: profileBase.updatedAt,
  },
  snapshotBase as any,
  nextVersion.data ?? 1,
  12,
);

console.log(\`invalidHistoryEntryRedirect=\${invalidIdRedirect}\`);
console.log(\`routeHashMismatchDetected=\${routeHash !== mismatchRouteHash}\`);
console.log(\`routeHashMismatchRedirect=\${mismatchRedirect}\`);
console.log(\`degradedWriteRedirect=\${degradedRedirect}\`);
console.log(\`successRedirect=\${successRedirect}\`);
console.log(\`skippedRedirect=\${skippedRedirect}\`);
console.log(\`explicitRecomputeAppendsVersion=\${insertedHistoryVersion === 5}\`);
console.log(\`explicitRecomputeTracksSourceHistory=\${insertedRecomputedFromId === 12}\`);
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

void test("explicit recompute rejects invalid history ids", () => {
  const output = runHistoryRecomputeContinuityProbe();
  assert.match(output, /invalidHistoryEntryRedirect=\/dashboard\?error=Invalid\+history\+entry\./);
});

void test("explicit recompute enforces route-hash continuity boundary", () => {
  const output = runHistoryRecomputeContinuityProbe();
  assert.match(output, /routeHashMismatchDetected=true/);
  assert.match(
    output,
    /routeHashMismatchRedirect=\/dashboard\?error=Recompute\+is\+available\+only\+for\+the\+currently\+uploaded\+route\+context\./,
  );
});

void test("explicit recompute surfaces degraded history persistence warning", () => {
  const output = runHistoryRecomputeContinuityProbe();
  assert.match(
    output,
    /degradedWriteRedirect=\/dashboard\?warning=Latest\+estimation\+was\+updated%2C\+but\+history\+could\+not\+be\+saved\+right\+now\./,
  );
});

void test("explicit recompute keeps successful path warning-free", () => {
  const output = runHistoryRecomputeContinuityProbe();
  assert.match(output, /successRedirect=\/dashboard/);
  assert.match(
    output,
    /skippedRedirect=\/dashboard\?warning=Recompute\+skipped\+because\+profile\+or\+route\+context\+is\+incomplete\./,
  );
});

void test("explicit recompute persists as appended history version", () => {
  const output = runHistoryRecomputeContinuityProbe();
  assert.match(output, /explicitRecomputeAppendsVersion=true/);
  assert.match(output, /explicitRecomputeTracksSourceHistory=true/);
});

import { execSync } from "node:child_process";
import assert from "node:assert/strict";
import { unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import test from "node:test";

function runHistoryContractsProbe() {
  const scriptPath = join(process.cwd(), ".tmp-history-contracts-probe.ts");
  const script = `
import { buildRouteEstimationDeduplicationKey } from "./src/lib/estimation/history-signature.ts";
import {
  listRouteEstimationHistoryForUser,
  persistRouteEstimationBundle,
  upsertRouteEstimationHistoryEntryForUser,
} from "./src/lib/estimation/service.ts";
import { listSavedRouteHistoryForUser, upsertSavedRouteHistoryForUser } from "./src/lib/route/service.ts";

const snapshot = {
  userId: "user-1",
  sourceFileName: "Tatra.gpx",
  sourceFileSizeBytes: 12000,
  pointCount: 3,
  totalDistanceM: 5123,
  elevationGainM: 640,
  elevationLossM: 620,
  minElevationM: 900,
  maxElevationM: 1520,
  startLat: 49.2,
  startLng: 20.1,
  endLat: 49.25,
  endLng: 20.15,
  bounds: { minLat: 49.2, minLng: 20.1, maxLat: 49.25, maxLng: 20.15 },
  plannedRunAt: "2026-09-20T05:30:00.000Z",
  geometry: [
    { lat: 49.2, lng: 20.1, eleM: 900 },
    { lat: 49.22, lng: 20.12, eleM: 1200 },
    { lat: 49.25, lng: 20.15, eleM: 1520 },
  ],
  uploadedAt: "2026-09-13T22:00:00.000Z",
  createdAt: "2026-09-13T22:00:00.000Z",
  updatedAt: "2026-09-13T22:00:00.000Z",
};

const profileA = {
  experienceLevel: "intermediate",
  weightKg: 72,
  weeklyDistanceKm: 35,
  updatedAt: "2026-09-13T22:00:00.000Z",
};
const profileB = { ...profileA, weeklyDistanceKm: 42 };

const keyA1 = await buildRouteEstimationDeduplicationKey(snapshot, profileA);
const keyA2 = await buildRouteEstimationDeduplicationKey(snapshot, profileA);
const keyB = await buildRouteEstimationDeduplicationKey(snapshot, profileB);
const keyRenamed = await buildRouteEstimationDeduplicationKey(
  {
    ...snapshot,
    sourceFileName: "same-track-renamed.gpx",
    sourceFileSizeBytes: 9999,
  },
  profileA,
);
const keyDifferentRunTime = await buildRouteEstimationDeduplicationKey(
  {
    ...snapshot,
    plannedRunAt: "2026-09-20T07:30:00.000Z",
  },
  profileA,
);

const listOrder = [];
const routeListOrder = [];
let estimationConflict = "";
let routeConflict = "";
let rpcName = "";
let rpcDerivedMetrics = "";
let rpcPlannedRunAt = "";

const listSupabase = {
  from() {
    return {
      select() {
        return {
          eq() {
            return {
              order(column, { ascending }) {
                listOrder.push(\`\${column}:\${ascending ? "asc" : "desc"}\`);
                return this;
              },
              limit() {
                return Promise.resolve({ data: [], error: null });
              },
            };
          },
        };
      },
    };
  },
};

const routeListSupabase = {
  from() {
    return {
      select() {
        return {
          eq() {
            return {
              order(column, { ascending }) {
                routeListOrder.push(\`\${column}:\${ascending ? "asc" : "desc"}\`);
                return this;
              },
              limit() {
                return Promise.resolve({ data: [], error: null });
              },
            };
          },
        };
      },
    };
  },
};

const upsertSupabase = {
  from() {
    return {
      upsert(_payload, options) {
        estimationConflict = options.onConflict ?? "";
        return {
          select() {
            return {
              single() {
                return Promise.resolve({
                  data: {
                    id: 11,
                    user_id: "user-1",
                    route_hash: keyA1.routeHash,
                    profile_signature: keyA1.profileSignature,
                    estimated_time_minutes: 100,
                    difficulty: "medium",
                    average_slope_percent: 7.2,
                    effort_score: 4.8,
                    derived_metrics: {
                      averageSlopePercent: 7.2,
                      elevationPerKmM: 120,
                      profileAdjustmentFactor: 1.1,
                      effortScore: 4.8,
                      globalTimeMultiplierApplied: 1,
                      externalSignals: {
                        itra: {
                          status: "missing",
                          source: "itra",
                          rawScore: null,
                          globalTimeMultiplier: 1,
                          message: "ITRA index is unavailable, so a neutral runner factor was applied.",
                          asOf: null,
                        },
                        weather: {
                          status: "not_applicable",
                          source: "open-meteo",
                          meanTemperatureC: null,
                          globalTimeMultiplier: 1,
                          message: "Weather impact was skipped because no run datetime was provided.",
                          asOf: null,
                        },
                      },
                    },
                    source_uploaded_at: "2026-09-13T22:00:00.000Z",
                    profile_updated_at: "2026-09-13T22:00:00.000Z",
                    computed_at: "2026-09-13T22:01:00.000Z",
                    created_at: "2026-09-13T22:01:00.000Z",
                    updated_at: "2026-09-13T22:01:00.000Z",
                  },
                  error: null,
                });
              },
            };
          },
        };
      },
    };
  },
};

const routeUpsertSupabase = {
  from() {
    return {
      upsert(_payload, options) {
        routeConflict = options.onConflict ?? "";
        return {
          select() {
            return {
              single() {
                return Promise.resolve({
                  data: {
                    id: 22,
                    user_id: "user-1",
                    route_hash: keyA1.routeHash,
                    source_file_name: "Tatra.gpx",
                    source_file_size_bytes: 12000,
                    point_count: 3,
                    total_distance_m: 5123,
                    elevation_gain_m: 640,
                    elevation_loss_m: 620,
                    min_elevation_m: 900,
                    max_elevation_m: 1520,
                    start_lat: 49.2,
                    start_lng: 20.1,
                    end_lat: 49.25,
                    end_lng: 20.15,
                    bounds: { minLat: 49.2, minLng: 20.1, maxLat: 49.25, maxLng: 20.15 },
                    planned_run_at: "2026-09-20T05:30:00.000Z",
                    uploaded_at: "2026-09-13T22:00:00.000Z",
                    last_estimated_at: "2026-09-13T22:01:00.000Z",
                    created_at: "2026-09-13T22:01:00.000Z",
                    updated_at: "2026-09-13T22:01:00.000Z",
                  },
                  error: null,
                });
              },
            };
          },
        };
      },
    };
  },
};

const rpcSupabase = {
  rpc(name, args) {
    rpcName = name;
    rpcDerivedMetrics = JSON.stringify(args?.p_derived_metrics ?? {});
    rpcPlannedRunAt = String(args?.p_planned_run_at ?? "");
    return Promise.resolve({ error: null });
  },
};

await listRouteEstimationHistoryForUser(listSupabase as any, "user-1", 20);
await listSavedRouteHistoryForUser(routeListSupabase as any, "user-1", 20);
await upsertRouteEstimationHistoryEntryForUser(
  upsertSupabase as any,
  "user-1",
  keyA1,
  {
    estimatedTimeMinutes: 100,
    difficulty: "medium",
    derivedMetrics: {
      averageSlopePercent: 7.2,
      elevationPerKmM: 120,
      profileAdjustmentFactor: 1.1,
      effortScore: 4.8,
      globalTimeMultiplierApplied: 1,
      externalSignals: {
        itra: {
          status: "missing",
          source: "itra",
          rawScore: null,
          globalTimeMultiplier: 1,
          message: "ITRA index is unavailable, so a neutral runner factor was applied.",
          asOf: null,
        },
        weather: {
          status: "not_applicable",
          source: "open-meteo",
          meanTemperatureC: null,
          globalTimeMultiplier: 1,
          message: "Weather impact was skipped because no run datetime was provided.",
          asOf: null,
        },
      },
    },
    computedAt: "2026-09-13T22:01:00.000Z",
  },
  {
    sourceUploadedAt: "2026-09-13T22:00:00.000Z",
    profileUpdatedAt: "2026-09-13T22:00:00.000Z",
  },
);
await upsertSavedRouteHistoryForUser(
  routeUpsertSupabase as any,
  "user-1",
  keyA1.routeHash,
  snapshot,
  "2026-09-13T22:01:00.000Z",
);
await persistRouteEstimationBundle(
  rpcSupabase as any,
  "user-1",
  keyA1,
  {
    estimatedTimeMinutes: 100,
    difficulty: "medium",
    derivedMetrics: {
      averageSlopePercent: 7.2,
      elevationPerKmM: 120,
      profileAdjustmentFactor: 1.1,
      effortScore: 4.8,
      globalTimeMultiplierApplied: 1,
      externalSignals: {
        itra: {
          status: "missing",
          source: "itra",
          rawScore: null,
          globalTimeMultiplier: 1,
          message: "ITRA index is unavailable, so a neutral runner factor was applied.",
          asOf: null,
        },
        weather: {
          status: "not_applicable",
          source: "open-meteo",
          meanTemperatureC: null,
          globalTimeMultiplier: 1,
          message: "Weather impact was skipped because no run datetime was provided.",
          asOf: null,
        },
      },
    },
    computedAt: "2026-09-13T22:01:00.000Z",
  },
  {
    sourceUploadedAt: "2026-09-13T22:00:00.000Z",
    profileUpdatedAt: "2026-09-13T22:00:00.000Z",
  },
  snapshot,
);

console.log(\`sameInputSameKey=\${keyA1.routeHash === keyA2.routeHash && keyA1.profileSignature === keyA2.profileSignature}\`);
console.log(\`differentProfileDifferentSignature=\${keyA1.profileSignature !== keyB.profileSignature}\`);
console.log(\`differentFileMetadataSameRouteHash=\${keyA1.routeHash === keyRenamed.routeHash}\`);
console.log(\`differentRunTimeDifferentRouteHash=\${keyA1.routeHash !== keyDifferentRunTime.routeHash}\`);
console.log(\`estimationListOrder=\${listOrder.join(",")}\`);
console.log(\`savedRouteListOrder=\${routeListOrder.join(",")}\`);
console.log(\`estimationUpsertConflict=\${estimationConflict}\`);
console.log(\`savedRouteUpsertConflict=\${routeConflict}\`);
console.log(\`bundleRpcName=\${rpcName}\`);
console.log(\`bundleRpcCarriesSignals=\${rpcDerivedMetrics.includes("\\"externalSignals\\"") && rpcDerivedMetrics.includes("\\"globalTimeMultiplierApplied\\"")}\`);
console.log(\`bundleRpcCarriesPlannedRunAt=\${rpcPlannedRunAt === "2026-09-20T05:30:00.000Z"}\`);
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

void test("dedupe keys are stable for same inputs", () => {
  const output = runHistoryContractsProbe();
  assert.match(output, /sameInputSameKey=true/);
});

void test("profile signature changes when profile input changes", () => {
  const output = runHistoryContractsProbe();
  assert.match(output, /differentProfileDifferentSignature=true/);
});

void test("route hash ignores filename and file size metadata", () => {
  const output = runHistoryContractsProbe();
  assert.match(output, /differentFileMetadataSameRouteHash=true/);
});

void test("route hash changes when planned run datetime changes", () => {
  const output = runHistoryContractsProbe();
  assert.match(output, /differentRunTimeDifferentRouteHash=true/);
});

void test("history list ordering contracts are stable", () => {
  const output = runHistoryContractsProbe();
  assert.match(output, /estimationListOrder=computed_at:desc,id:desc/);
  assert.match(output, /savedRouteListOrder=last_estimated_at:desc,id:desc/);
});

void test("history upserts keep explicit dedupe conflict keys", () => {
  const output = runHistoryContractsProbe();
  assert.match(output, /estimationUpsertConflict=user_id,route_hash,profile_signature,history_version/);
  assert.match(output, /savedRouteUpsertConflict=user_id,route_hash/);
});

void test("bundle persistence uses transactional rpc contract", () => {
  const output = runHistoryContractsProbe();
  assert.match(output, /bundleRpcName=persist_route_estimation_bundle/);
});

void test("bundle persistence keeps external signal snapshot in derived metrics payload", () => {
  const output = runHistoryContractsProbe();
  assert.match(output, /bundleRpcCarriesSignals=true/);
  assert.match(output, /bundleRpcCarriesPlannedRunAt=true/);
});

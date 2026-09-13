import { execSync } from "node:child_process";
import assert from "node:assert/strict";
import { unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import test from "node:test";

function runDashboardHistoryProbe() {
  const scriptPath = join(process.cwd(), ".tmp-dashboard-history-view-probe.ts");
  const script = `
import { buildSavedEstimationHistoryItems, resolveSavedHistoryWarning } from "./src/lib/estimation/history-view.ts";

const estimationHistory = [
  {
    id: 3,
    userId: "u1",
    deduplicationKey: { routeHash: "rh-1", profileSignature: "ps-1" },
    estimatedTimeMinutes: 145,
    difficulty: "hard",
    derivedMetrics: {
      averageSlopePercent: 8.2,
      elevationPerKmM: 120,
      profileAdjustmentFactor: 1.1,
      effortScore: 5.2,
    },
    sourceUploadedAt: "2026-09-13T22:00:00.000Z",
    profileUpdatedAt: "2026-09-13T22:00:00.000Z",
    computedAt: "2026-09-13T22:01:00.000Z",
    createdAt: "2026-09-13T22:01:00.000Z",
    updatedAt: "2026-09-13T22:01:00.000Z",
  },
  {
    id: 2,
    userId: "u1",
    deduplicationKey: { routeHash: "rh-missing", profileSignature: "ps-2" },
    estimatedTimeMinutes: 98,
    difficulty: "medium",
    derivedMetrics: {
      averageSlopePercent: 5.2,
      elevationPerKmM: 90,
      profileAdjustmentFactor: 1.0,
      effortScore: 3.8,
    },
    sourceUploadedAt: "2026-09-12T22:00:00.000Z",
    profileUpdatedAt: "2026-09-12T22:00:00.000Z",
    computedAt: "2026-09-12T22:01:00.000Z",
    createdAt: "2026-09-12T22:01:00.000Z",
    updatedAt: "2026-09-12T22:01:00.000Z",
  },
];

const routeHistory = [
  {
    id: 7,
    userId: "u1",
    routeHash: "rh-1",
    sourceFileName: "Tatra.gpx",
    sourceFileSizeBytes: 10000,
    pointCount: 30,
    totalDistanceM: 14500,
    elevationGainM: 980,
    elevationLossM: 980,
    minElevationM: 800,
    maxElevationM: 1800,
    startLat: 49.2,
    startLng: 20.1,
    endLat: 49.25,
    endLng: 20.15,
    bounds: { minLat: 49.2, minLng: 20.1, maxLat: 49.25, maxLng: 20.15 },
    uploadedAt: "2026-09-13T22:00:00.000Z",
    lastEstimatedAt: "2026-09-13T22:01:00.000Z",
    createdAt: "2026-09-13T22:01:00.000Z",
    updatedAt: "2026-09-13T22:01:00.000Z",
  },
];

const items = buildSavedEstimationHistoryItems(estimationHistory as any, routeHistory as any);
console.log(\`itemCount=\${items.length}\`);
console.log(\`firstHasRouteName=\${items[0]?.sourceFileName}\`);
console.log(\`secondHasRouteFallback=\${items[1]?.sourceFileName === null}\`);
console.log(\`warningPrefersQuery=\${resolveSavedHistoryWarning("from-query", new Error("x"), null)}\`);
console.log(\`warningFromErrors=\${resolveSavedHistoryWarning(null, null, new Error("y"))}\`);
console.log(\`warningNone=\${resolveSavedHistoryWarning(null, null, null) === null}\`);
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

void test("dashboard history view builds merged list entries", () => {
  const output = runDashboardHistoryProbe();
  assert.match(output, /itemCount=2/);
  assert.match(output, /firstHasRouteName=Tatra.gpx/);
  assert.match(output, /secondHasRouteFallback=true/);
});

void test("dashboard history warning resolution keeps deterministic precedence", () => {
  const output = runDashboardHistoryProbe();
  assert.match(output, /warningPrefersQuery=from-query/);
  assert.match(
    output,
    /warningFromErrors=Latest estimation is available, but saved history could not be fully loaded right now\./,
  );
  assert.match(output, /warningNone=true/);
});

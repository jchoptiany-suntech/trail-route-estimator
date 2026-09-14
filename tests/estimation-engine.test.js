import { execSync } from "node:child_process";
import assert from "node:assert/strict";
import { unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import test from "node:test";

/**
 * @typedef {Object} ProbeOutput
 * @property {string} deterministicCoreEqual
 * @property {string} invalidProfileError
 * @property {string} mappedInvalidRouteCode
 * @property {string} mappedInvalidRouteMessage
 * @property {string} mappedUnknownCode
 * @property {string} mappedUnknownMessage
 * @property {string} itraClampApplied
 * @property {string} weatherNotApplicableNeutral
 * @property {string} averagePacePresent
 */

function runEstimationProbe() {
  const scriptPath = join(process.cwd(), ".tmp-estimation-probe.ts");
  const script = `
import { computeRouteEstimation, EstimationError } from "./src/lib/estimation/engine.ts";
import { mapRouteEstimationError } from "./src/lib/estimation/error-mapping.ts";

const input = {
  userId: "user-1",
  routeSnapshot: {
    id: "snapshot-1",
    userId: "user-1",
    pointCount: 3,
    totalDistanceM: 5000,
    elevationGainM: 120,
    elevationLossM: 115,
    geometry: [
      { lat: 50.0, lng: 20.0, eleM: 220 },
      { lat: 50.005, lng: 20.01, eleM: 260 },
      { lat: 50.01, lng: 20.02, eleM: 340 }
    ],
    bounds: { minLat: 50.0, minLng: 20.0, maxLat: 50.01, maxLng: 20.02 },
    uploadedAt: "2026-09-13T21:00:00.000Z",
    createdAt: "2026-09-13T21:00:00.000Z",
    updatedAt: "2026-09-13T21:00:00.000Z"
  },
  profile: {
    experienceLevel: "intermediate",
    weightKg: 72,
    weeklyDistanceKm: 35,
    updatedAt: "2026-09-13T21:00:00.000Z"
  }
};

const first = computeRouteEstimation(input);
const second = computeRouteEstimation(input);
const boundedSignalResult = computeRouteEstimation({
  ...input,
  externalSignals: {
    itra: {
      status: "available",
      source: "itra",
      rawScore: 720,
      globalTimeMultiplier: 1.3,
      message: null,
      asOf: "2026-09-13T21:00:00.000Z",
    },
    weather: {
      status: "not_applicable",
      source: "open-meteo",
      meanTemperatureC: null,
      globalTimeMultiplier: 0.92,
      message: "Weather skipped",
      asOf: null,
    },
  },
});
const invalidProfileError = (() => {
  try {
    computeRouteEstimation({
      ...input,
      profile: { ...input.profile, weeklyDistanceKm: 0 }
    });
    return null;
  } catch (error) {
    return error instanceof EstimationError ? error.code : "unexpected";
  }
})();

const mappedInvalidRoute = mapRouteEstimationError(
  new EstimationError("invalid_route", "Route must contain at least two points."),
);
const mappedUnknown = mapRouteEstimationError(new Error("boom"));

console.log(\`deterministicCoreEqual=\${
  first.estimatedTimeMinutes === second.estimatedTimeMinutes &&
  first.difficulty === second.difficulty &&
  first.derivedMetrics.effortScore === second.derivedMetrics.effortScore &&
  first.derivedMetrics.profileAdjustmentFactor === second.derivedMetrics.profileAdjustmentFactor
}\`);
console.log(\`invalidProfileError=\${invalidProfileError}\`);
console.log(\`mappedInvalidRouteCode=\${mappedInvalidRoute.code}\`);
console.log(\`mappedInvalidRouteMessage=\${mappedInvalidRoute.message}\`);
console.log(\`mappedUnknownCode=\${mappedUnknown.code}\`);
console.log(\`mappedUnknownMessage=\${mappedUnknown.message}\`);
console.log(\`itraClampApplied=\${boundedSignalResult.derivedMetrics.globalTimeMultiplierApplied === 1.05}\`);
console.log(\`weatherNotApplicableNeutral=\${boundedSignalResult.estimatedTimeMinutes > first.estimatedTimeMinutes}\`);
console.log(\`averagePacePresent=\${typeof first.derivedMetrics.averagePaceMinPerKm === "number" && first.derivedMetrics.averagePaceMinPerKm > 0}\`);
`;
  writeFileSync(scriptPath, script, "utf8");
  try {
    const command =
      process.platform === "win32" ? `npx.cmd --yes tsx "${scriptPath}"` : `npx --yes tsx "${scriptPath}"`;
    const output = execSync(command, { encoding: "utf8" });
    /** @type {ProbeOutput} */
    const parsed = {
      deterministicCoreEqual: "",
      invalidProfileError: "",
      mappedInvalidRouteCode: "",
      mappedInvalidRouteMessage: "",
      mappedUnknownCode: "",
      mappedUnknownMessage: "",
      itraClampApplied: "",
      weatherNotApplicableNeutral: "",
      averagePacePresent: "",
    };

    for (const line of output.trim().split(/\r?\n/)) {
      const delimiterIndex = line.indexOf("=");
      if (delimiterIndex <= 0) {
        continue;
      }
      const key = line.slice(0, delimiterIndex);
      const value = line.slice(delimiterIndex + 1);
      if (key in parsed) {
        parsed[key] = value;
      }
    }

    return parsed;
  } finally {
    unlinkSync(scriptPath);
  }
}

void test("estimation engine is deterministic for same input", () => {
  const probe = runEstimationProbe();
  assert.equal(probe.deterministicCoreEqual, "true");
});

void test("estimation engine rejects invalid profile input", () => {
  const probe = runEstimationProbe();
  assert.equal(probe.invalidProfileError, "invalid_profile");
});

void test("estimation error mapping is stable", () => {
  const probe = runEstimationProbe();
  assert.equal(probe.mappedInvalidRouteCode, "invalid_route");
  assert.equal(probe.mappedInvalidRouteMessage, "Route data is not sufficient to compute an estimation.");
  assert.equal(probe.mappedUnknownCode, "unknown");
  assert.equal(probe.mappedUnknownMessage, "Something went wrong while calculating your personalized estimation.");
});

void test("estimation engine clamps ITRA and ignores weather when not applicable", () => {
  const probe = runEstimationProbe();
  assert.equal(probe.itraClampApplied, "true");
  assert.equal(probe.weatherNotApplicableNeutral, "true");
  assert.equal(probe.averagePacePresent, "true");
});

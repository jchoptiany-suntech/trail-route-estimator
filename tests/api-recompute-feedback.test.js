import { execSync } from "node:child_process";
import assert from "node:assert/strict";
import { unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import test from "node:test";

function runApiRecomputeFeedbackProbe() {
  const scriptPath = join(process.cwd(), ".tmp-api-recompute-feedback-probe.ts");
  const script = `
import { createRouteEstimationError } from "./src/lib/estimation/error-mapping.ts";
import { resolveProfileRecomputeWarning, resolveUploadRecomputeWarning } from "./src/lib/estimation/recompute-feedback.ts";

  const success = { ok: true, estimation: {}, warnings: [] } as const;
  const successWithWarnings = {
    ok: true,
    estimation: {},
    warnings: ["ITRA index is unavailable, so a neutral runner factor was applied."],
} as const;
  const skipped = { ok: false, skipped: true, reason: "incomplete_profile" } as const;
  const fullFailure = {
    ok: false,
    error: createRouteEstimationError("storage_failure"),
  } as const;
const partialFailure = {
  ok: false,
  partial: true,
  stage: "saved_route_history",
  error: createRouteEstimationError("history_storage_failure"),
} as const;

console.log(\`uploadSuccess=\${resolveUploadRecomputeWarning(success as any) === null}\`);
console.log(\`uploadSuccessWarn=\${resolveUploadRecomputeWarning(successWithWarnings as any)}\`);
console.log(\`uploadSkipped=\${resolveUploadRecomputeWarning(skipped as any) === null}\`);
console.log(\`uploadFailure=\${resolveUploadRecomputeWarning(fullFailure as any)}\`);
console.log(\`uploadPartial=\${resolveUploadRecomputeWarning(partialFailure as any)}\`);
console.log(\`profileSuccess=\${resolveProfileRecomputeWarning(success as any) === null}\`);
console.log(\`profileSuccessWarn=\${resolveProfileRecomputeWarning(successWithWarnings as any)}\`);
console.log(\`profileSkipped=\${resolveProfileRecomputeWarning(skipped as any) === null}\`);
console.log(\`profileFailure=\${resolveProfileRecomputeWarning(fullFailure as any)}\`);
console.log(\`profilePartial=\${resolveProfileRecomputeWarning(partialFailure as any)}\`);
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

void test("upload flow keeps success and skipped recompute warning-free", () => {
  const output = runApiRecomputeFeedbackProbe();
  assert.match(output, /uploadSuccess=true/);
  assert.match(output, /uploadSkipped=true/);
});

void test("upload flow surfaces warning on successful recompute with optional-signal fallback", () => {
  const output = runApiRecomputeFeedbackProbe();
  assert.match(output, /uploadSuccessWarn=ITRA index is unavailable, so a neutral runner factor was applied\./);
});

void test("upload flow surfaces warnings for full and history-only failures", () => {
  const output = runApiRecomputeFeedbackProbe();
  assert.match(output, /uploadFailure=Unable to save estimation right now. Please try again\./);
  assert.match(output, /uploadPartial=Latest estimation was updated, but history could not be saved right now\./);
});

void test("profile flow keeps success and skipped recompute warning-free", () => {
  const output = runApiRecomputeFeedbackProbe();
  assert.match(output, /profileSuccess=true/);
  assert.match(output, /profileSkipped=true/);
});

void test("profile flow surfaces warning on successful recompute with optional-signal fallback", () => {
  const output = runApiRecomputeFeedbackProbe();
  assert.match(
    output,
    /profileSuccessWarn=Profile saved, but itra index is unavailable, so a neutral runner factor was applied\./,
  );
});

void test("profile flow surfaces warnings for full and history-only failures", () => {
  const output = runApiRecomputeFeedbackProbe();
  assert.match(output, /profileFailure=Profile saved, but unable to save estimation right now\. please try again\./);
  assert.match(
    output,
    /profilePartial=Profile saved, but latest estimation was updated, but history could not be saved right now\./,
  );
});

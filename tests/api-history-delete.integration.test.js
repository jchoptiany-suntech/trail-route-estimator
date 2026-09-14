import { execSync } from "node:child_process";
import assert from "node:assert/strict";
import { unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import test from "node:test";

function runApiHistoryDeleteProbe() {
  const scriptPath = join(process.cwd(), ".tmp-api-history-delete-probe.ts");
  const script = `
import { buildRouteHash } from "./src/lib/estimation/history-signature.ts";
import { deleteRouteEstimationHistoryEntryForUser } from "./src/lib/estimation/service.ts";

function dashboardErrorRedirect(message: string): string {
  const params = new URLSearchParams();
  params.set("error", message);
  return \`/dashboard?\${params.toString()}\`;
}

function dashboardSuccessRedirect(message: string): string {
  const params = new URLSearchParams();
  params.set("success", message);
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

async function resolveHistoryDeleteRedirect(input: {
  hasSupabase: boolean;
  hasUser: boolean;
  historyEntryIdRaw: string | null;
  historyEntry: { routeHash: string } | null;
  snapshot: {
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
    plannedRunAt: string | null;
  } | null;
  deleteResult: { deleted: boolean; error: Error | null };
}): Promise<string> {
  if (!input.hasSupabase) {
    return dashboardErrorRedirect("Supabase is not configured.");
  }

  if (!input.hasUser) {
    return "/auth/signin";
  }

  const historyEntryId = parseHistoryEntryId(input.historyEntryIdRaw);
  if (historyEntryId === null) {
    return dashboardErrorRedirect("Invalid history entry.");
  }

  if (!input.historyEntry) {
    return dashboardErrorRedirect("Unable to load selected history entry.");
  }

  if (input.snapshot) {
    const currentRouteHash = await buildRouteHash(input.snapshot as any);
    if (currentRouteHash === input.historyEntry.routeHash) {
      return dashboardErrorRedirect("You cannot delete history for the currently uploaded route context.");
    }
  }

  if (input.deleteResult.error || !input.deleteResult.deleted) {
    return dashboardErrorRedirect("Unable to delete selected history entry.");
  }

  return dashboardSuccessRedirect("History entry deleted.");
}

const snapshot = {
  pointCount: 3,
  totalDistanceM: 5200,
  elevationGainM: 340,
  elevationLossM: 320,
  minElevationM: 910,
  maxElevationM: 1290,
  startLat: 49.2,
  startLng: 20.1,
  endLat: 49.25,
  endLng: 20.15,
  bounds: { minLat: 49.2, minLng: 20.1, maxLat: 49.25, maxLng: 20.15 },
  plannedRunAt: "2026-09-20T05:30:00.000Z",
};

const currentRouteHash = await buildRouteHash(snapshot as any);
const differentRouteHash = await buildRouteHash({ ...snapshot, plannedRunAt: "2026-09-20T06:30:00.000Z" } as any);

const unauthenticatedRedirect = await resolveHistoryDeleteRedirect({
  hasSupabase: true,
  hasUser: false,
  historyEntryIdRaw: "1",
  historyEntry: { routeHash: differentRouteHash },
  snapshot,
  deleteResult: { deleted: true, error: null },
});

const invalidIdRedirect = await resolveHistoryDeleteRedirect({
  hasSupabase: true,
  hasUser: true,
  historyEntryIdRaw: "abc",
  historyEntry: { routeHash: differentRouteHash },
  snapshot,
  deleteResult: { deleted: true, error: null },
});

const missingEntryRedirect = await resolveHistoryDeleteRedirect({
  hasSupabase: true,
  hasUser: true,
  historyEntryIdRaw: "9",
  historyEntry: null,
  snapshot,
  deleteResult: { deleted: true, error: null },
});

const protectedEntryRedirect = await resolveHistoryDeleteRedirect({
  hasSupabase: true,
  hasUser: true,
  historyEntryIdRaw: "9",
  historyEntry: { routeHash: currentRouteHash },
  snapshot,
  deleteResult: { deleted: true, error: null },
});

const deleteErrorRedirect = await resolveHistoryDeleteRedirect({
  hasSupabase: true,
  hasUser: true,
  historyEntryIdRaw: "9",
  historyEntry: { routeHash: differentRouteHash },
  snapshot,
  deleteResult: { deleted: false, error: new Error("db") },
});

const successRedirect = await resolveHistoryDeleteRedirect({
  hasSupabase: true,
  hasUser: true,
  historyEntryIdRaw: "9",
  historyEntry: { routeHash: differentRouteHash },
  snapshot,
  deleteResult: { deleted: true, error: null },
});

let filterUserId: string | null = null;
let filterEntryId: number | null = null;
const deleteServiceSupabase = {
  from(name: string) {
    if (name !== "route_estimation_history") {
      throw new Error("Unexpected table");
    }
    return {
      delete() {
        return {
          eq(key: string, value: string | number) {
            if (key === "user_id") {
              filterUserId = String(value);
            }
            if (key === "id") {
              filterEntryId = Number(value);
            }
            return this;
          },
          select() {
            return {
              maybeSingle() {
                return Promise.resolve({ data: { id: 9 }, error: null });
              },
            };
          },
        };
      },
    };
  },
};

const deleteServiceResult = await deleteRouteEstimationHistoryEntryForUser(deleteServiceSupabase as any, "user-7", 9);

console.log(\`unauthenticatedRedirect=\${unauthenticatedRedirect}\`);
console.log(\`invalidIdRedirect=\${invalidIdRedirect}\`);
console.log(\`missingEntryRedirect=\${missingEntryRedirect}\`);
console.log(\`protectedEntryRedirect=\${protectedEntryRedirect}\`);
console.log(\`deleteErrorRedirect=\${deleteErrorRedirect}\`);
console.log(\`successRedirect=\${successRedirect}\`);
console.log(\`serviceDeleteSuccess=\${deleteServiceResult.deleted && deleteServiceResult.error === null}\`);
console.log(\`serviceFilterUserId=\${filterUserId}\`);
console.log(\`serviceFilterEntryId=\${filterEntryId}\`);
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

void test("history delete redirects unauthenticated users to signin", () => {
  const output = runApiHistoryDeleteProbe();
  assert.match(output, /unauthenticatedRedirect=\/auth\/signin/);
});

void test("history delete validates historyEntryId and missing entries", () => {
  const output = runApiHistoryDeleteProbe();
  assert.match(output, /invalidIdRedirect=\/dashboard\?error=Invalid\+history\+entry\./);
  assert.match(output, /missingEntryRedirect=\/dashboard\?error=Unable\+to\+load\+selected\+history\+entry\./);
});

void test("history delete blocks current-route history removal", () => {
  const output = runApiHistoryDeleteProbe();
  assert.match(
    output,
    /protectedEntryRedirect=\/dashboard\?error=You\+cannot\+delete\+history\+for\+the\+currently\+uploaded\+route\+context\./,
  );
});

void test("history delete surfaces delete failures and success redirect", () => {
  const output = runApiHistoryDeleteProbe();
  assert.match(output, /deleteErrorRedirect=\/dashboard\?error=Unable\+to\+delete\+selected\+history\+entry\./);
  assert.match(output, /successRedirect=\/dashboard\?success=History\+entry\+deleted\./);
});

void test("history delete service scopes deletion by owner and entry id", () => {
  const output = runApiHistoryDeleteProbe();
  assert.match(output, /serviceDeleteSuccess=true/);
  assert.match(output, /serviceFilterUserId=user-7/);
  assert.match(output, /serviceFilterEntryId=9/);
});

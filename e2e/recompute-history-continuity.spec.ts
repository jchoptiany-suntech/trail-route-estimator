import { expect, test } from "@playwright/test";
import { ensureProfileCompleted } from "./support/auth";

// risk: context/foundation/test-plan.md #1 — recompute should preserve continuity visibility.
// seed: e2e/seed.spec.ts (not present yet in this repository).
test.describe("Risk #1 — recompute continuity visibility", () => {
  test("recompute keeps latest estimation visible even when no new history version appears", async ({ page }) => {
    // Ensure profile is complete through the UI to keep auth/routing/API/DB boundaries real.
    await ensureProfileCompleted(page);

    // Upload a unique GPX route so this scenario is isolated across parallel/repeated runs.
    const runId = Date.now();
    const routeFileName = `risk1-route-${runId}.gpx`;
    const latBase = 50 + (runId % 1000) / 1000000;
    const gpxPayload = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="playwright-e2e">
  <trk>
    <name>${routeFileName}</name>
    <trkseg>
      <trkpt lat="${latBase}" lon="19.9"><ele>250</ele></trkpt>
      <trkpt lat="${latBase + 0.01}" lon="19.91"><ele>270</ele></trkpt>
      <trkpt lat="${latBase + 0.02}" lon="19.92"><ele>260</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

    await page.getByLabel("GPX file").setInputFiles({
      name: routeFileName,
      mimeType: "application/gpx+xml",
      buffer: Buffer.from(gpxPayload, "utf-8"),
    });
    await page.getByRole("button", { name: /Upload route|Replace latest route/ }).click();
    await expect(page.getByText("GPX uploaded successfully.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Personalized estimation" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Recompute" })).toBeVisible();

    // Recompute from the current history entry and assert continuity remains visible.
    await page.getByRole("button", { name: "Recompute" }).click();
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
    await expect(page.getByRole("heading", { name: "Personalized estimation" })).toBeVisible();
    await expect(
      page.getByText("Latest estimation was updated, but history could not be saved right now."),
    ).toHaveCount(0);

    const historyEntriesForRoute = page.getByRole("listitem").filter({ hasText: routeFileName });
    await expect(historyEntriesForRoute.first()).toBeVisible();
    await expect(historyEntriesForRoute).toHaveCount(1);
    await expect(historyEntriesForRoute.filter({ hasText: "v2" })).toHaveCount(0);

    // Reload and verify continuity remains visible in the rendered dashboard state.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Personalized estimation" })).toBeVisible();
    await expect(
      page.getByText("Latest estimation was updated, but history could not be saved right now."),
    ).toHaveCount(0);
  });
});

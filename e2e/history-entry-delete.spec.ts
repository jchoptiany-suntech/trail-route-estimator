import { expect, test } from "@playwright/test";
import { ensureProfileCompleted } from "./support/auth";

test.describe("History entry deletion", () => {
  test("deletes a non-current history entry while keeping latest estimation available", async ({ page }) => {
    const runId = Date.now();
    const firstRouteName = `history-delete-a-${runId}.gpx`;
    const secondRouteName = `history-delete-b-${runId}.gpx`;

    const latBase = 50 + (runId % 1000) / 1000000;
    const firstGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="playwright-e2e">
  <trk><name>${firstRouteName}</name><trkseg>
    <trkpt lat="${latBase}" lon="19.9"><ele>250</ele></trkpt>
    <trkpt lat="${latBase + 0.01}" lon="19.91"><ele>265</ele></trkpt>
    <trkpt lat="${latBase + 0.02}" lon="19.92"><ele>260</ele></trkpt>
  </trkseg></trk>
</gpx>`;

    const secondGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="playwright-e2e">
  <trk><name>${secondRouteName}</name><trkseg>
    <trkpt lat="${latBase + 1}" lon="20.1"><ele>300</ele></trkpt>
    <trkpt lat="${latBase + 1.01}" lon="20.11"><ele>320</ele></trkpt>
    <trkpt lat="${latBase + 1.02}" lon="20.12"><ele>310</ele></trkpt>
  </trkseg></trk>
</gpx>`;

    await ensureProfileCompleted(page);

    await page.getByLabel("GPX file").setInputFiles({
      name: firstRouteName,
      mimeType: "application/gpx+xml",
      buffer: Buffer.from(firstGpx, "utf-8"),
    });
    await page.getByRole("button", { name: /Upload route|Replace latest route/ }).click();
    await expect(page.getByRole("heading", { name: "Saved estimation history" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: firstRouteName })).toHaveCount(1);

    await page.getByLabel("GPX file").setInputFiles({
      name: secondRouteName,
      mimeType: "application/gpx+xml",
      buffer: Buffer.from(secondGpx, "utf-8"),
    });
    await page.getByRole("button", { name: /Upload route|Replace latest route/ }).click();
    await expect(page.getByRole("listitem").filter({ hasText: secondRouteName })).toHaveCount(1);

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page
      .getByRole("listitem")
      .filter({ hasText: firstRouteName })
      .getByRole("button", { name: /Delete saved estimation/ })
      .click();

    await expect(page).toHaveURL(/\/dashboard\?success=History\+entry\+deleted\./);
    await expect(page.getByText("History entry deleted.")).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: firstRouteName })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Personalized estimation" })).toBeVisible();
  });
});

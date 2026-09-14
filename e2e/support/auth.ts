import { expect, type Page } from "@playwright/test";

function readRequiredEnv(name: "E2E_USER_EMAIL" | "E2E_USER_PASSWORD"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required to run authenticated E2E tests.`);
  }
  return value;
}

export async function signInThroughUi(page: Page): Promise<void> {
  const email = readRequiredEnv("E2E_USER_EMAIL");
  const password = readRequiredEnv("E2E_USER_PASSWORD");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto("/auth/signin");

    if (page.url().includes("/dashboard") || page.url().includes("/profile")) {
      return;
    }

    const emailField = page.locator("#email");
    const passwordField = page.locator("#password");

    await emailField.click();
    await emailField.press("Control+A");
    await emailField.type(email, { delay: 20 });
    await passwordField.click();
    await passwordField.press("Control+A");
    await passwordField.type(password, { delay: 20 });
    await expect(emailField).toHaveValue(email);
    await expect(passwordField).toHaveValue(password);

    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForLoadState("networkidle");

    if (!page.url().includes("/auth/signin")) {
      return;
    }
  }

  throw new Error("Sign in failed. Verify E2E_USER_EMAIL/E2E_USER_PASSWORD and account confirmation status.");
}

export async function ensureProfileCompleted(page: Page): Promise<void> {
  await signInThroughUi(page);
  await page.goto("/profile");

  if (page.url().includes("/auth/signin")) {
    await signInThroughUi(page);
    await page.goto("/profile");
  }

  if (page.url().includes("/dashboard")) {
    return;
  }

  await expect(page).toHaveURL(/\/profile(?:\?|$)/);
  await page.getByLabel("Experience level").fill("Intermediate");
  await page.getByLabel("Weight (kg)").fill("72");
  await page.getByLabel("Weekly running distance (km)").fill("45");
  await page.getByLabel("ITRA index (optional)").fill("500");
  await page.getByRole("button", { name: "Complete profile" }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
}

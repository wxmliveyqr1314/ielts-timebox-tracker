import { expect, test } from "@playwright/test";
import { seedAppState } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await seedAppState(page);
});

test("navigates the four main pages without runtime errors", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Daily" })).toBeVisible();

  await page.getByRole("button", { name: "History" }).click();
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();

  await page.getByRole("button", { name: "Stats" }).click();
  await expect(page.getByRole("heading", { name: "Stats" })).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByText("Local-First Backup")).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("renders deterministic History and Stats data", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "History" }).click();

  await expect(page.getByText("4", { exact: true }).first()).toBeVisible();
  for (const status of ["green", "yellow", "red", "pending"]) {
    await expect(page.getByText(status, { exact: true }).first()).toBeVisible();
  }

  await page.getByRole("button", { name: /expand jun 27, 2026/i }).click();
  await expect(page.getByPlaceholder(/task notes/i).first()).toBeVisible();

  await page.getByRole("button", { name: "Stats" }).click();
  await expect(page.getByText("Status distribution")).toBeVisible();
  await expect(page.getByText("5h 20m")).toBeVisible();
  await expect(page.getByText("No stats yet")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(/NaN|Infinity/);
});

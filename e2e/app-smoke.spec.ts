import { expect, test } from "@playwright/test";
import { APP_STATE_KEY, seedAppState, seedWallpaper } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await seedAppState(page);
});

test("navigates all five main pages without runtime errors", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Daily" })).toBeVisible();

  await page.getByRole("button", { name: "Study", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Study Plan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Momo vocabulary" })).toBeVisible();

  await page.getByRole("button", { name: "History" }).click();
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();

  await page.getByRole("button", { name: "Stats" }).click();
  await expect(page.getByRole("heading", { name: "Stats" })).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByText("Local-First Backup")).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("Study remains read-only with wallpaper and fits phone, tablet, and desktop widths", async ({ page }) => {
  await page.goto("/");
  await seedWallpaper(page);
  await page.reload();
  const before = await page.evaluate((key) => localStorage.getItem(key), APP_STATE_KEY);
  await page.getByRole("button", { name: "Study", exact: true }).click();
  await expect(page.locator('[data-wallpaper-active="true"]')).toBeVisible();

  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole("heading", { name: "Study Plan" })).toBeVisible();
    const overflow = await page.evaluate(() => {
      const scroller = document.querySelector("main > [data-wallpaper-active]")!;
      return Math.max(
        document.documentElement.scrollWidth - window.innerWidth,
        scroller.scrollWidth - scroller.clientWidth,
      );
    });
    expect(overflow).toBeLessThanOrEqual(0);
  }

  await page.getByRole("heading", { name: "No compensatory staying up" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "No compensatory staying up" })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), APP_STATE_KEY)).toBe(before);
});

test("old history remains visible without appearing in recent study totals", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 26, 12));
  await page.goto("/");
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByRole("region", { name: "Recent history summary" })).toContainText("0Days");
  await expect(page.getByRole("button", { name: /expand jun 27, 2026/i })).toBeVisible();
  await page.getByRole("button", { name: "Stats", exact: true }).click();
  await expect(page.getByRole("group", { name: "Study time" })).toContainText("0m");
  await expect(page.getByRole("region", { name: "Reward points" })).toContainText("1.5");
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

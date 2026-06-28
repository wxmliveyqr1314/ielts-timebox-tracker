import { expect, test } from "@playwright/test";
import { seedAppState, seedWallpaper } from "./fixtures";

test("restores the local wallpaper without mobile horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAppState(page);
  await page.goto("/");
  await seedWallpaper(page);
  await page.reload();

  const content = page.locator('[data-wallpaper-active="true"]');
  await expect(content).toBeVisible();
  await expect(page.locator(".fixed-wallpaper-layer")).toBeVisible();

  await page.getByRole("button", { name: "History" }).click();
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();

  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(overflow.body).toBeLessThanOrEqual(0);
  expect(overflow.document).toBeLessThanOrEqual(0);
});

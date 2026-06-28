import { expect, test } from "@playwright/test";
import { seedAppState, seedWallpaper } from "./fixtures";

test("publishes the approved install manifest and icons", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    name: "TimeBox Tracker",
    short_name: "TimeBox",
    display: "standalone",
    start_url: "/",
    scope: "/",
    theme_color: "#4F46E5",
    background_color: "#F8FAFC",
  });
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ src: "/pwa-192x192.png", sizes: "192x192" }),
    expect.objectContaining({ src: "/pwa-512x512.png", sizes: "512x512" }),
    expect.objectContaining({ src: "/maskable-512x512.png", purpose: "maskable" }),
  ]));

  for (const icon of manifest.icons) {
    expect((await request.get(icon.src)).ok()).toBe(true);
  }
});

test("provides offline application shell and retains local data", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAppState(page);

  await page.goto("/");
  await seedWallpaper(page);
  await page.reload();

  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.ready));

  // Reload once online so navigator.serviceWorker.controller is truthy
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));

  try {
    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole("status").filter({ hasText: "Offline" })).toBeVisible();
    await expect(page.locator('[data-wallpaper-active="true"]')).toBeVisible();

    await page.getByRole("button", { name: "History" }).click();
    await expect(page.getByRole("button", { name: /expand jun 27, 2026/i })).toBeVisible();

    await page.getByRole("button", { name: "Stats" }).click();
    await expect(page.getByText("No stats yet")).toHaveCount(0);
    await expect(page.getByText("Current streak")).toBeVisible();

    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByText("Cloud account and sync actions are unavailable offline.")).toBeVisible();
    await expect(page.getByText("Wallpaper cloud controls are unavailable offline.")).toBeVisible();

    const sendMagicLinkBtn = page.getByRole("button", { name: "Send Magic Link" });
    if (await sendMagicLinkBtn.count() > 0) {
      await expect(sendMagicLinkBtn).toBeDisabled();
    }

    const verifyCodeBtn = page.getByRole("button", { name: "Verify Code" });
    if (await verifyCodeBtn.count() > 0) {
      await expect(verifyCodeBtn).toBeDisabled();
    }

    const syncNowBtn = page.getByRole("button", { name: "Sync now" });
    if (await syncNowBtn.count() > 0) {
      await expect(syncNowBtn).toBeDisabled();
    }

    await expect(page.getByLabel("Choose wallpaper image")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Upload & Apply" })).toBeDisabled();

    // Check for no horizontal overflow
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow).toBe(false);
  } finally {
    await context.setOffline(false);
  }
});

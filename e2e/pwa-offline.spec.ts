import { expect, test } from "@playwright/test";
import { seedAppState, seedWallpaper } from "./fixtures";

test("publishes the approved install manifest and icons", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    name: "TimeBox 雅思学习助手",
    short_name: "雅思学习",
    lang: "zh-CN",
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

    await expect(page.getByRole("status").filter({ hasText: "当前离线" })).toBeVisible();
    await expect(page.locator('[data-wallpaper-active="true"]')).toBeVisible();

    await page.getByRole("button", { name: "学习指南", exact: true }).click();
    await expect(page.getByRole("heading", { name: "学习指南" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Momo 词汇复习" })).toBeVisible();

    await page.getByRole("button", { name: "历史" }).click();
    await expect(page.getByRole("button", { name: /展开2026年6月27日/i })).toBeVisible();

    await page.getByRole("button", { name: "统计" }).click();
    await expect(page.getByText("暂无统计数据")).toHaveCount(0);
    await expect(page.getByText("当前连续学习")).toBeVisible();

    await page.getByRole("button", { name: "设置" }).click();
    await expect(page.getByText("离线时无法使用账户和云同步，本地数据仍可使用。")).toBeVisible();
    await expect(page.getByText("离线时无法修改云壁纸，已缓存的壁纸仍可显示。")).toBeVisible();

    const sendMagicLinkBtn = page.getByRole("button", { name: "发送登录邮件" });
    if (await sendMagicLinkBtn.count() > 0) {
      await expect(sendMagicLinkBtn).toBeDisabled();
    }

    const verifyCodeBtn = page.getByRole("button", { name: "验证登录" });
    if (await verifyCodeBtn.count() > 0) {
      await expect(verifyCodeBtn).toBeDisabled();
    }

    const syncNowBtn = page.getByRole("button", { name: "立即同步" });
    if (await syncNowBtn.count() > 0) {
      await expect(syncNowBtn).toBeDisabled();
    }

    await expect(page.getByLabel("选择壁纸图片")).toBeDisabled();
    await expect(page.getByRole("button", { name: "上传并应用" })).toBeDisabled();

    // Check for no horizontal overflow
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow).toBe(false);
  } finally {
    await context.setOffline(false);
  }
});

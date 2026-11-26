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
  await expect(page.getByRole("button", { name: "今日", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "学习指南", exact: true }).click();
  await expect(page.getByRole("heading", { name: "学习指南" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Momo 词汇复习" })).toBeVisible();

  await page.getByRole("button", { name: "历史" }).click();
  await expect(page.getByRole("heading", { name: "历史" })).toBeVisible();

  await page.getByRole("button", { name: "统计" }).click();
  await expect(page.getByRole("heading", { name: "统计" })).toBeVisible();

  await page.getByRole("button", { name: "设置" }).click();
  await expect(page.getByText("本地数据与备份")).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("Study remains read-only with wallpaper and fits phone, tablet, and desktop widths", async ({ page }) => {
  await page.goto("/");
  await seedWallpaper(page);
  await page.reload();
  const before = await page.evaluate((key) => localStorage.getItem(key), APP_STATE_KEY);
  await page.getByRole("button", { name: "学习指南", exact: true }).click();
  await expect(page.locator('[data-wallpaper-active="true"]')).toBeVisible();

  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole("heading", { name: "学习指南" })).toBeVisible();
    const overflow = await page.evaluate(() => {
      const scroller = document.querySelector("main > [data-wallpaper-active]")!;
      return Math.max(
        document.documentElement.scrollWidth - window.innerWidth,
        scroller.scrollWidth - scroller.clientWidth,
      );
    });
    expect(overflow).toBeLessThanOrEqual(0);
  }

  await page.getByRole("heading", { name: "不补偿性熬夜" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "不补偿性熬夜" })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), APP_STATE_KEY)).toBe(before);
});

test("old history remains visible without appearing in recent study totals", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 26, 12));
  await page.goto("/");
  await page.getByRole("button", { name: "历史", exact: true }).click();
  await expect(page.getByRole("region", { name: "最近学习记录概览" })).toContainText("0天数");
  await expect(page.getByRole("button", { name: /展开2026年6月27日/i })).toBeVisible();
  await page.getByRole("button", { name: "统计", exact: true }).click();
  await expect(page.getByRole("group", { name: "学习时长" })).toContainText("0分钟");
  const streak = page.getByRole("group", { name: "当前连续学习" });
  await expect(streak).toContainText("0天");
  await expect(streak).toContainText("历史最佳：2天");
  await expect(page.getByRole("region", { name: "学习积分" })).toContainText("1.5");
});

test("renders deterministic History and Stats data", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "历史" }).click();

  await expect(page.getByText("4", { exact: true }).first()).toBeVisible();
  for (const status of ["达标", "部分完成", "需调整", "待开始"]) {
    await expect(page.getByText(status, { exact: true }).first()).toBeVisible();
  }

  await page.getByRole("button", { name: /展开2026年6月27日/i }).click();
  await expect(page.getByPlaceholder(/任务备注/i).first()).toBeVisible();

  await page.getByRole("button", { name: "统计" }).click();
  await expect(page.getByText("完成情况")).toBeVisible();
  await expect(page.getByText("5小时20分钟")).toBeVisible();
  await expect(page.getByText("暂无统计数据")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(/NaN|Infinity/);
});

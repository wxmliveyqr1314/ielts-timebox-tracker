import { expect, test, type Page } from "@playwright/test";
import { APP_STATE_KEY, seedWallpaper, WALLPAPER_META_KEY } from "./fixtures";

async function startWithEmptyLocalData(page: Page): Promise<void> {
  await page.addInitScript(
    ({ appStateKey, wallpaperMetaKey }) => {
      const initializedKey = "e2e_dynamic_plan_initialized";
      if (sessionStorage.getItem(initializedKey) !== "true") {
        localStorage.removeItem(appStateKey);
        localStorage.removeItem(wallpaperMetaKey);
        indexedDB.deleteDatabase("ielts_timebox_wallpaper_v1");
        sessionStorage.setItem(initializedKey, "true");
      }
    },
    { appStateKey: APP_STATE_KEY, wallpaperMetaKey: WALLPAPER_META_KEY },
  );
}

function bonusInput(page: Page, label: string) {
  return page.getByText(label, { exact: true }).locator("..").getByRole("spinbutton");
}

function summaryValue(page: Page, label: string) {
  return page
    .getByRole("region", { name: "计划概览" })
    .getByText(label, { exact: true })
    .locator("..")
    .locator("span")
    .last();
}

function watchRuntimeErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflows = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(overflows.body).toBeLessThanOrEqual(0);
  expect(overflows.document).toBeLessThanOrEqual(0);
}

async function generateInitialDictationPlan(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "工作日", exact: true }).click();
  await page.getByRole("button", { name: "否", exact: true }).click();
  await page.getByRole("button", { name: "正常", exact: true }).click();
  await page.getByRole("button", { name: "听写", exact: true }).click();
  await bonusInput(page, "Momo 词汇").fill("20");
  await bonusInput(page, "王陆听写").fill("30");
  await bonusInput(page, "雅思阅读").fill("10");
  await bonusInput(page, "泛听").fill("75");
  await page.getByRole("button", { name: "生成计划" }).click();
  await expect(page.getByRole("region", { name: "计划概览" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await startWithEmptyLocalData(page);
});

test("generates a capacity-aware mobile plan from completed-earlier inputs", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await generateInitialDictationPlan(page);

  await expect(summaryValue(page, "当前模式目标")).toHaveText("175分钟");
  await expect(summaryValue(page, "提前完成的学习")).toHaveText("-50分钟");
  await expect(summaryValue(page, "今晚必做")).toHaveText("125分钟");
  await expect(page.getByText("已达到参考时长，额外泛听按需进行。")).toBeVisible();

  await expectNoHorizontalOverflow(page);
  expect(runtimeErrors).toEqual([]);
});

test("optional stretch stays separate from baseline status on mobile", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await generateInitialDictationPlan(page);

  await expect(summaryValue(page, "今晚必做")).toHaveText("125分钟");
  await page.getByRole("switch", { name: "添加可选加练" }).click();
  await page.getByRole("button", { name: "同方向加练" }).click();
  await page.getByRole("button", { name: "预览加练变更" }).click();

  const dialog = page.getByRole("dialog", { name: "确认计划变更" });
  await dialog.getByRole("button", { name: "应用新计划" }).click();

  await expect(page.getByRole("region", { name: "可选加练任务" })).toBeVisible();
  await expect(page.getByText("跳过不扣分")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(runtimeErrors).toEqual([]);
});

test("preserves real task progress when regenerating a different plan", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await generateInitialDictationPlan(page);

  await page.getByRole("spinbutton", { name: "新听写单元的实际分钟数" }).fill("18");
  await page.getByRole("button", { name: "历史" }).click();
  await page.getByRole("button", { name: /^展开/ }).first().click();
  const historyTask = page
    .getByText("新听写单元", { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'space-y-2')][1]");
  await historyTask.getByPlaceholder("任务备注（选填）").fill("Preserve this note");

  await page.getByRole("button", { name: "今日" }).click();
  await page.getByRole("button", { name: "调整计划设置" }).click();
  await page.getByRole("button", { name: "偏低", exact: true }).click();
  await page.getByRole("button", { name: "阅读", exact: true }).click();
  await page.getByLabel("今晚可用的专注学习时间").fill("90");
  await page.getByRole("button", { name: "预览新计划" }).click();

  const dialog = page.getByRole("dialog", { name: "确认计划变更" });
  await expect(dialog).toContainText("已记录的时长、完成情况和备注都会保留。");
  await dialog.getByRole("button", { name: "应用新计划" }).click();

  const earlierProgress = page.getByRole("region", { name: "此前已完成" });
  await expect(earlierProgress.getByText("新听写单元", { exact: true })).toBeVisible();
  await expect(
    earlierProgress.getByRole("spinbutton", { name: "新听写单元的实际分钟数" }),
  ).toHaveValue("18");

  await page.getByRole("button", { name: "历史" }).click();
  await page.getByRole("button", { name: /^展开/ }).first().click();
  const preservedTask = page
    .getByText("新听写单元", { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'space-y-2')][1]");
  await expect(preservedTask.getByPlaceholder("任务备注（选填）")).toHaveValue("Preserve this note");
  expect(runtimeErrors).toEqual([]);
});

test("persists the generated summary and reports completed-earlier totals once", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await generateInitialDictationPlan(page);

  await page.reload();
  await expect(summaryValue(page, "当前模式目标")).toHaveText("175分钟");
  await expect(summaryValue(page, "提前完成的学习")).toHaveText("-50分钟");
  await expect(summaryValue(page, "今晚必做")).toHaveText("125分钟");

  await page.getByRole("button", { name: "历史" }).click();
  await page.getByRole("button", { name: /^展开/ }).first().click();
  const historicalSummary = page.getByRole("region", { name: "历史计划概览" });
  await expect(historicalSummary.getByText("工作日", { exact: true })).toBeVisible();
  await expect(
    historicalSummary.getByText("提前完成的学习", { exact: true }).first().locator("..").locator("span").last(),
  ).toHaveText("135分钟");

  await page.getByRole("button", { name: "统计" }).click();
  const timeByModule = page.getByText("各项学习时长", { exact: true }).locator("..");
  for (const [label, minutes] of [
    ["Momo", "20分钟"],
    ["听写", "30分钟"],
    ["阅读", "10分钟"],
    ["泛听", "75分钟"],
  ] as const) {
    await expect(
      timeByModule.getByText(label, { exact: true }).locator("..").getByText(minutes, { exact: true }),
    ).toBeVisible();
  }
  expect(runtimeErrors).toEqual([]);
});

test("keeps the wallpaper-backed Daily plan within phone, tablet, and desktop widths", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await generateInitialDictationPlan(page);
  await seedWallpaper(page);
  await page.reload();
  await expect(page.locator('[data-wallpaper-active="true"]')).toBeVisible();

  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoHorizontalOverflow(page);
  }
  expect(runtimeErrors).toEqual([]);
});

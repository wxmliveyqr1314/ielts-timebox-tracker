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
    .getByRole("region", { name: "Plan summary" })
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
  await page.getByRole("button", { name: "Workday", exact: true }).click();
  await page.getByRole("button", { name: "No", exact: true }).click();
  await page.getByRole("button", { name: "Normal", exact: true }).click();
  await page.getByRole("button", { name: "Dictation", exact: true }).click();
  await bonusInput(page, "Momo Vocab").fill("20");
  await bonusInput(page, "Wang Lu (Dict)").fill("30");
  await bonusInput(page, "IELTS Reading").fill("10");
  await bonusInput(page, "Passive Listen").fill("75");
  await page.getByRole("button", { name: "Generate Plan" }).click();
  await expect(page.getByRole("region", { name: "Plan summary" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await startWithEmptyLocalData(page);
});

test("generates a capacity-aware mobile plan from completed-earlier inputs", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await generateInitialDictationPlan(page);

  await expect(summaryValue(page, "Mode target")).toHaveText("175m");
  await expect(summaryValue(page, "Completed earlier")).toHaveText("-50m");
  await expect(summaryValue(page, "Tonight focused")).toHaveText("125m");
  await expect(page.getByText("Reference already met. Extra listening stays optional.")).toBeVisible();

  await expectNoHorizontalOverflow(page);
  expect(runtimeErrors).toEqual([]);
});

test("optional stretch stays separate from baseline status on mobile", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await generateInitialDictationPlan(page);

  await expect(summaryValue(page, "Tonight focused")).toHaveText("125m");
  await page.getByRole("switch", { name: "Add optional stretch" }).click();
  await page.getByRole("button", { name: "Same Focus" }).click();
  await page.getByRole("button", { name: "Preview stretch changes" }).click();

  const dialog = page.getByRole("dialog", { name: "Review plan changes" });
  await dialog.getByRole("button", { name: "Apply regenerated plan" }).click();

  await expect(page.getByRole("region", { name: "Optional stretch tasks" })).toBeVisible();
  await expect(page.getByText("0 penalty if skipped")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(runtimeErrors).toEqual([]);
});

test("preserves real task progress when regenerating a different plan", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await generateInitialDictationPlan(page);

  await page.getByRole("spinbutton", { name: "Actual minutes for New dictation unit" }).fill("18");
  await page.getByRole("button", { name: "History" }).click();
  await page.getByRole("button", { name: /^Expand / }).first().click();
  const historyTask = page
    .getByText("New dictation unit", { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'space-y-2')][1]");
  await historyTask.getByPlaceholder("Task notes (optional)").fill("Preserve this note");

  await page.getByRole("button", { name: "Daily" }).click();
  await page.getByRole("button", { name: "Edit plan inputs" }).click();
  await page.getByRole("button", { name: "Low", exact: true }).click();
  await page.getByRole("button", { name: "Reading", exact: true }).click();
  await page.getByLabel("Focused minutes available tonight").fill("90");
  await page.getByRole("button", { name: "Preview regenerated plan" }).click();

  const dialog = page.getByRole("dialog", { name: "Review plan changes" });
  await expect(dialog).toContainText("Actual minutes, completion, and notes will be preserved.");
  await dialog.getByRole("button", { name: "Apply regenerated plan" }).click();

  const earlierProgress = page.getByRole("region", { name: "Earlier progress" });
  await expect(earlierProgress.getByText("New dictation unit", { exact: true })).toBeVisible();
  await expect(
    earlierProgress.getByRole("spinbutton", { name: "Actual minutes for New dictation unit" }),
  ).toHaveValue("18");

  await page.getByRole("button", { name: "History" }).click();
  await page.getByRole("button", { name: /^Expand / }).first().click();
  const preservedTask = page
    .getByText("New dictation unit", { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'space-y-2')][1]");
  await expect(preservedTask.getByPlaceholder("Task notes (optional)")).toHaveValue("Preserve this note");
  expect(runtimeErrors).toEqual([]);
});

test("persists the generated summary and reports completed-earlier totals once", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await generateInitialDictationPlan(page);

  await page.reload();
  await expect(summaryValue(page, "Mode target")).toHaveText("175m");
  await expect(summaryValue(page, "Completed earlier")).toHaveText("-50m");
  await expect(summaryValue(page, "Tonight focused")).toHaveText("125m");

  await page.getByRole("button", { name: "History" }).click();
  await page.getByRole("button", { name: /^Expand / }).first().click();
  const historicalSummary = page.getByRole("region", { name: "Historical plan summary" });
  await expect(historicalSummary.getByText("Workday", { exact: true })).toBeVisible();
  await expect(
    historicalSummary.getByText("Completed earlier", { exact: true }).first().locator("..").locator("span").last(),
  ).toHaveText("135m");

  await page.getByRole("button", { name: "Stats" }).click();
  const timeByModule = page.getByText("Time by module", { exact: true }).locator("..");
  for (const [label, minutes] of [
    ["Momo", "20m"],
    ["Dictation", "30m"],
    ["Reading", "10m"],
    ["Passive Listen", "75m"],
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

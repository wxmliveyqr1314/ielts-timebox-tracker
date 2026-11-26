import { expect, test } from "@playwright/test";
import { APP_STATE_KEY, TEST_APP_STATE } from "./fixtures";

test("uses Chinese across the interface while preserving legacy titles and English notes in storage", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date(2026, 5, 27, 12));
  await page.goto("/");
  await page.evaluate(({ key, source }) => {
    const state = structuredClone(source);
    state.records["2026-06-27"].tasks[0].title = "Momo vocabulary";
    state.records["2026-06-27"].notes = "Describe a memorable journey";
    localStorage.setItem(key, JSON.stringify(state));
  }, { key: APP_STATE_KEY, source: TEST_APP_STATE });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByRole("button", { name: /标记为未完成：Momo 词汇复习/ })).toBeVisible();

  for (const [index, label] of ["今日", "学习指南", "历史", "统计", "设置"].entries()) {
    await page.getByRole("button", { name: label, exact: true }).click();
    const overflow = await page.evaluate(() => {
      const main = document.querySelector("main > div[data-wallpaper-active]")!;
      return Math.max(document.documentElement.scrollWidth - window.innerWidth, main.scrollWidth - main.clientWidth);
    });
    expect(overflow).toBeLessThanOrEqual(0);
    await page.screenshot({ path: testInfo.outputPath(`zh-${index}.png`), animations: "disabled" });
  }

  await expect(page.getByText("邮箱登录", { exact: true })).toBeVisible();
  await expect(page.getByText("本地数据与备份")).toBeVisible();
  await page.getByRole("button", { name: "历史", exact: true }).click();
  await page.getByRole("button", { name: "展开2026年6月27日" }).click();
  await expect(page.getByPlaceholder("记录今天的体会或需要调整的地方")).toHaveValue("Describe a memorable journey");
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), APP_STATE_KEY);
  expect(saved.records["2026-06-27"].tasks[0].title).toBe("Momo vocabulary");
  expect(saved.records["2026-06-27"].status).toBe("green");
  expect(saved.records["2026-06-27"].notes).toBe("Describe a memorable journey");
});

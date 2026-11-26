import { expect, test } from "@playwright/test";
import { APP_STATE_KEY, TEST_APP_STATE } from "./fixtures";

test("History details receive fresh timestamps and survive reload and navigation", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-26T04:00:00.000Z"));
  await page.goto("/");
  await page.evaluate(({ key, state }) => {
    localStorage.setItem(key, JSON.stringify(state));
  }, { key: APP_STATE_KEY, state: TEST_APP_STATE });
  await page.reload();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page.getByRole("button", { name: /expand jun 27, 2026/i }).click();

  const date = "2026-06-27";
  const original = TEST_APP_STATE.records[date];
  let previousTimestamp = original.updatedAt;
  const edits = [
    { selector: page.getByPlaceholder("Any reflections?"), field: "notes", value: "Reviewed listening errors" },
    { selector: page.getByPlaceholder("What's the very first action tomorrow?"), field: "tomorrowFirstStep", value: "Review three difficult sentences" },
    { selector: page.locator('input[type="time"]'), field: "bedtime", value: "22:15" },
  ];

  for (const { selector, field, value } of edits) {
    await selector.fill(value);
    const saved = await page.evaluate(({ key, date }) => {
      return JSON.parse(localStorage.getItem(key)!).records[date];
    }, { key: APP_STATE_KEY, date });
    expect(saved[field]).toBe(value);
    expect(Date.parse(saved.updatedAt)).toBeGreaterThan(Date.parse(previousTimestamp));
    expect(saved.createdAt).toBe(original.createdAt);
    previousTimestamp = saved.updatedAt;
  }

  await page.reload();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page.getByRole("button", { name: /expand jun 27, 2026/i }).click();
  await expect(page.getByPlaceholder("Any reflections?")).toHaveValue(edits[0].value);
  await expect(page.getByPlaceholder("What's the very first action tomorrow?")).toHaveValue(edits[1].value);
  await expect(page.locator('input[type="time"]')).toHaveValue("22:15");
  await page.getByRole("button", { name: "Stats", exact: true }).click();
  await expect(page.getByRole("group", { name: "Current streak" })).toContainText("0Days");
  const finalState = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), APP_STATE_KEY);
  expect(finalState.records[date].updatedAt).toBe(previousTimestamp);
  expect(finalState.records["2026-06-26"]).toEqual(TEST_APP_STATE.records["2026-06-26"]);
});

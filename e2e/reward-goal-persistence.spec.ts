import { expect, test } from '@playwright/test';
import { APP_STATE_KEY, TEST_APP_STATE } from './fixtures';

test('offline reward edits and clear markers survive reload and page navigation', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key: APP_STATE_KEY, state: TEST_APP_STATE });
  await page.reload();
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await context.setOffline(true);
  await page.getByLabel('奖励名称').fill('吃火锅');
  await page.getByLabel('目标积分').fill('20');
  await page.getByRole('button', { name: '保存奖励目标' }).click();
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).rewards, APP_STATE_KEY);
  const saved = await read();
  expect(saved.updatedAt).toBeTruthy();
  await page.getByRole('button', { name: '统计', exact: true }).click();
  await expect(page.getByText('吃火锅', { exact: true })).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await expect(page.getByLabel('奖励名称')).toHaveValue('吃火锅');
  await page.getByRole('button', { name: '清除奖励目标' }).click();
  const cleared = await read();
  expect(cleared.activeGoal).toBeUndefined();
  expect(Date.parse(cleared.updatedAt)).toBeGreaterThan(Date.parse(saved.updatedAt));
  await page.reload();
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await expect(page.getByLabel('奖励名称')).toHaveValue('');
  expect(await read()).toEqual(cleared);
  await page.screenshot({ path: 'test-results/reward-goal-settings.png', fullPage: true });
});

import { describe, expect, it, vi } from 'vitest';
import { normalizeRewardSettings, syncRewardSettings } from './rewardSync';
import { syncAppData } from './cloudSync';
import type { RewardSettings } from '../types';

const time = '2026-11-26T04:00:00.000Z';
const goal = { id: 'goal', title: '吃火锅', targetPoints: 20, createdAt: time };
const local: RewardSettings = { schemaVersion: 1, activeGoal: goal, updatedAt: time };
const row = { schema_version: 1, goal_json: goal, updated_at: time, device_id: 'device-a' };
const client = (response: unknown) => ({ rpc: vi.fn().mockResolvedValue(response) } as any);

describe('reward synchronization', () => {
  it('uploads an old goal using its creation time, never the current sync time', async () => {
    const cloud = client({ data: [row], error: null });
    const result = await syncRewardSettings({ schemaVersion: 1, activeGoal: goal }, 'device-a', cloud);
    expect(cloud.rpc).toHaveBeenCalledWith('sync_reward_settings', {
      p_goal: goal, p_updated_at: time, p_device_id: 'device-a',
    });
    expect(result.status).toBe('uploaded');
    expect(result.rewards?.updatedAt).toBe(time);
  });

  it.each([undefined, { schemaVersion: 1 }])('an empty legacy device only reads', async (rewards) => {
    const cloud = client({ data: [row], error: null });
    const result = await syncRewardSettings(rewards as RewardSettings, 'device-b', cloud);
    expect(cloud.rpc.mock.calls[0][1].p_updated_at).toBeNull();
    expect(result.status).toBe('downloaded');
    expect(result.rewards?.activeGoal).toEqual(goal);
  });

  it('downloads a winning clear marker instead of restoring an older active goal', async () => {
    const cloud = client({ data: [{ ...row, goal_json: null, updated_at: '2026-11-27T04:00:00Z' }], error: null });
    const result = await syncRewardSettings(local, 'device-b', cloud);
    expect(result.rewards?.activeGoal).toBeUndefined();
    expect(result.rewards?.updatedAt).toBe('2026-11-27T04:00:00.000Z');
    expect(result.status).toBe('downloaded');
  });

  it('uploads a clear marker and keeps an acknowledged snapshot unchanged', async () => {
    const clear: RewardSettings = { schemaVersion: 1, updatedAt: time };
    const cloud = client({ data: [{ ...row, goal_json: null }], error: null });
    const result = await syncRewardSettings(clear, 'device-a', cloud);
    expect(cloud.rpc.mock.calls[0][1].p_goal).toBeNull();
    expect(result.status).toBe('uploaded');
    expect((await syncRewardSettings(result.rewards, 'device-b', cloud)).status).toBe('unchanged');
  });

  it.each([
    null, { schemaVersion: 2 }, { ...local, updatedAt: 'bad' },
    { ...local, activeGoal: { ...goal, targetPoints: 1000 } },
  ])('rejects invalid local rewards before writing', async (value) => {
    const cloud = client({ data: [row] });
    const result = await syncRewardSettings(value as RewardSettings, 'device-a', cloud);
    expect(result.error).toBeTruthy();
    expect(result.rewards).toBe(value);
    expect(cloud.rpc).not.toHaveBeenCalled();
  });

  it.each([
    { ...row, goal_json: { ...goal, createdAt: 'bad' } },
    { ...row, updated_at: 'bad' }, { ...row, schema_version: 2 },
    { ...row, device_id: '' }, { ...row, goal_json: undefined },
  ])('preserves local rewards on an invalid server response', async (value) => {
    const result = await syncRewardSettings(local, 'device-a', client({ data: [value] }));
    expect(result.error).toBeTruthy();
    expect(result.rewards).toBe(local);
  });

  it('handles missing migrations, rejected fetches, and an empty cloud', async () => {
    expect((await syncRewardSettings(local, 'a', client({ error: { code: 'PGRST202' } }))).error).toContain('尚未启用');
    const network = { rpc: vi.fn().mockRejectedValue(new Error('offline')) } as any;
    expect((await syncRewardSettings(local, 'a', network)).rewards).toBe(local);
    expect(await syncRewardSettings(undefined, 'a', client({ data: [] }))).toEqual({ rewards: undefined, status: 'unchanged' });
    expect(normalizeRewardSettings({ schemaVersion: 1 }, 'a')).toBeUndefined();
  });
});

describe('manual sync coordinator', () => {
  function cloud(recordError = false, rewardError = false) {
    return {
      from: () => ({ select: () => ({ eq: async () => ({ data: [], error: recordError ? { message: 'failed' } : null }) }) }),
      rpc: vi.fn().mockResolvedValue(rewardError ? { error: { code: 'PGRST202' } } : { data: [row] }),
    } as any;
  }
  const sync = { schemaVersion: 1 as const, deviceId: 'a', lastSyncAt: '2026-11-20T00:00:00Z' };

  it('records full success with a separate reward outcome', async () => {
    const result = await syncAppData({ localState: { records: {} }, userId: 'u', deviceId: 'a', supabase: cloud() });
    expect(result.errors).toEqual([]);
    expect(result.mergedState.rewards?.activeGoal).toEqual(goal);
    expect(result.mergedState.sync?.lastSyncResult?.rewardStatus).toBe('downloaded');
  });

  it.each([[true, false], [false, true], [true, true]])('handles partial failure (%s, %s)', async (recordsFail, rewardsFail) => {
    const source = { records: {}, rewards: local, sync };
    const result = await syncAppData({ localState: source, userId: 'u', deviceId: 'a', supabase: cloud(recordsFail, rewardsFail) });
    expect(result.recordsSucceeded).toBe(!recordsFail);
    expect(result.rewardsSucceeded).toBe(!rewardsFail);
    expect(result.mergedState.sync?.lastSyncAt).toBe(sync.lastSyncAt);
    expect(result.mergedState.rewards).toEqual(rewardsFail ? local : { ...local, updatedBy: 'device-a' });
  });
});

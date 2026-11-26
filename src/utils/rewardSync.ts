import type { SupabaseClient } from '@supabase/supabase-js';
import type { RewardGoal, RewardSettings } from '../types';

export type RewardSyncStatus = 'uploaded' | 'downloaded' | 'unchanged';

function validDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseGoal(value: unknown): RewardGoal {
  if (!object(value) || typeof value.id !== 'string' || !value.id.trim() ||
      typeof value.title !== 'string' || !value.title.trim() || value.title.length > 60 ||
      typeof value.targetPoints !== 'number' || !Number.isFinite(value.targetPoints) ||
      value.targetPoints <= 0 || value.targetPoints > 999 || !validDate(value.createdAt) ||
      (value.note !== undefined && (typeof value.note !== 'string' || value.note.length > 120)) ||
      (value.completedAt !== undefined && !validDate(value.completedAt))) {
    throw new Error('Invalid reward goal');
  }
  // Fixed field order also makes equality independent of JSON object key order.
  return {
    id: value.id, title: value.title, targetPoints: value.targetPoints,
    ...(value.note !== undefined ? { note: value.note as string } : {}),
    createdAt: value.createdAt,
    ...(value.completedAt !== undefined ? { completedAt: value.completedAt as string } : {}),
  };
}

export function normalizeRewardSettings(value: unknown, deviceId: string): RewardSettings | undefined {
  if (value === undefined) return undefined;
  if (!object(value) || value.schemaVersion !== 1 ||
      (value.updatedAt !== undefined && !validDate(value.updatedAt)) ||
      (value.updatedBy !== undefined && (typeof value.updatedBy !== 'string' || !value.updatedBy.trim()))) {
    throw new Error('Invalid reward settings');
  }
  const goal = value.activeGoal === undefined ? undefined : parseGoal(value.activeGoal);
  // Legacy empty settings are not evidence of an intentional deletion.
  const timestamp = value.updatedAt ?? goal?.createdAt;
  if (!timestamp) return undefined;
  return {
    schemaVersion: 1,
    ...(goal ? { activeGoal: goal } : {}),
    updatedAt: new Date(timestamp as string).toISOString(),
    updatedBy: (value.updatedBy as string | undefined) ?? deviceId,
  };
}

export function nextRewardTimestamp(rewards?: RewardSettings): string {
  const previous = Date.parse(rewards?.updatedAt ?? rewards?.activeGoal?.createdAt ?? '');
  return new Date(Number.isFinite(previous) ? Math.max(Date.now(), previous + 1) : Date.now()).toISOString();
}

export async function syncRewardSettings(
  rewards: RewardSettings | undefined,
  deviceId: string,
  supabase: SupabaseClient,
): Promise<{ rewards?: RewardSettings; status: RewardSyncStatus; error?: string }> {
  try {
    const local = normalizeRewardSettings(rewards, deviceId);
    const { data, error } = await supabase.rpc('sync_reward_settings', {
      p_goal: local?.activeGoal ?? null,
      p_updated_at: local?.updatedAt ?? null,
      p_device_id: local?.updatedBy ?? deviceId,
    });
    if (error) {
      const missing = ['PGRST202', 'PGRST205', '42883', '42P01'].includes(error.code);
      return { rewards, status: 'unchanged', error: missing
        ? '奖励目标云同步尚未启用，请先完成云端数据库更新；奖励目标仍保存在本机。'
        : '奖励目标同步失败，本地目标已保留，请稍后重试。' };
    }
    if (!Array.isArray(data) || data.length > 1 || (data.length === 0 && local)) {
      throw new Error('Invalid reward sync response');
    }
    if (data.length === 0) return { rewards, status: 'unchanged' };
    const row = data[0];
    if (!object(row) || row.schema_version !== 1 || !validDate(row.updated_at) ||
        typeof row.device_id !== 'string' || !row.device_id.trim() ||
        (row.goal_json !== null && !object(row.goal_json))) {
      throw new Error('Invalid cloud reward settings');
    }
    const remote = normalizeRewardSettings({
      schemaVersion: row.schema_version,
      ...(row.goal_json !== null ? { activeGoal: row.goal_json } : {}),
      updatedAt: row.updated_at, updatedBy: row.device_id,
    }, deviceId)!;
    const same = JSON.stringify(local) === JSON.stringify(remote);
    return { rewards: remote, status: same
      ? (JSON.stringify(rewards) === JSON.stringify(remote) ? 'unchanged' : 'uploaded')
      : 'downloaded' };
  } catch {
    return { rewards, status: 'unchanged', error: '奖励目标同步失败，数据格式异常或网络不可用；本地目标已保留。' };
  }
}

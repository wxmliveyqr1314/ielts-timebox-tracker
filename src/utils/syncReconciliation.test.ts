import { describe, expect, it } from 'vitest';
import { reconcileSyncResult } from './syncReconciliation';
import type { AppState, DailyRecord } from '../types';

const record = (notes: string) => ({ notes } as DailyRecord);
const sync = { schemaVersion: 1 as const, deviceId: 'a' };

describe('sync response reconciliation', () => {
  const source: AppState = { records: { day1: record('old'), day2: record('old') }, rewards: { schemaVersion: 1 } };
  const result: AppState = {
    records: { day1: record('cloud'), day2: record('cloud'), day3: record('cloud') },
    rewards: { schemaVersion: 1, updatedAt: '2026-11-26T00:00:00Z' }, sync,
  };

  it('receives cloud data when nothing changed locally', () => {
    expect(reconcileSyncResult(source, source, result).records).toEqual(result.records);
    expect(reconcileSyncResult(source, source, result).rewards).toEqual(result.rewards);
  });

  it('preserves an in-flight save or clear together with a new record edit', () => {
    const current: AppState = { ...source,
      records: { ...source.records, day1: record('edited during request') },
      rewards: { schemaVersion: 1, updatedAt: '2026-11-27T00:00:00Z' },
    };
    const merged = reconcileSyncResult(current, source, result);
    expect(merged.rewards).toBe(current.rewards);
    expect(merged.records.day1.notes).toBe('edited during request');
    expect(merged.records.day2.notes).toBe('cloud');
    expect(merged.records.day3.notes).toBe('cloud');
  });

  it('does not restore a record deleted during the request', () => {
    const current = { records: { day2: source.records.day2 }, sync: { ...sync, deletedRecords: { day1: 'later' } } };
    const merged = reconcileSyncResult(current, source, result);
    expect(merged.records.day1).toBeUndefined();
    expect(merged.sync?.deletedRecords?.day1).toBe('later');
  });
});

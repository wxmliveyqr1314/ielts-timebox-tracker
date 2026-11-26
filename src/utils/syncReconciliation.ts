import type { AppState } from '../types';

const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Apply a response only to values that have not changed since its request began.
export function reconcileSyncResult(current: AppState, source: AppState, result: AppState): AppState {
  const records = { ...result.records };
  const deletedRecords = { ...result.sync?.deletedRecords };
  const dates = new Set([
    ...Object.keys(source.records), ...Object.keys(current.records),
    ...Object.keys(source.sync?.deletedRecords ?? {}), ...Object.keys(current.sync?.deletedRecords ?? {}),
  ]);
  for (const date of dates) {
    if (!equal(current.records[date], source.records[date]) ||
        current.sync?.deletedRecords?.[date] !== source.sync?.deletedRecords?.[date]) {
      if (current.records[date]) records[date] = current.records[date];
      else delete records[date];
      if (current.sync?.deletedRecords?.[date]) deletedRecords[date] = current.sync.deletedRecords[date];
      else delete deletedRecords[date];
    }
  }
  return {
    ...current,
    records,
    rewards: equal(current.rewards, source.rewards) ? result.rewards : current.rewards,
    sync: result.sync ? { ...result.sync, deletedRecords } : current.sync,
  };
}

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

let mockStates: any[] = [];
let stateIndex = 0;

vi.mock('react', () => {
  return {
    useState: (initial: any) => {
      const currentIndex = stateIndex++;
      if (mockStates[currentIndex] === undefined) {
        mockStates[currentIndex] = typeof initial === 'function' ? initial() : initial;
      }
      const setState = (updater: any) => {
        mockStates[currentIndex] = typeof updater === 'function' ? updater(mockStates[currentIndex]) : updater;
      };
      return [mockStates[currentIndex], setState];
    },
    useEffect: () => {}
  };
});

import { useAppData } from './useAppData';
import { DailyRecord } from '../types';
import { mergeLocalAndCloudRecords } from '../utils/cloudSync';

describe('useAppData', () => {
  beforeEach(() => {
    mockStates = [];
    stateIndex = 0;
    (global as any).localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      clear: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  const createDummyRecord = (date: string): DailyRecord => ({
    date,
    weekday: 'Mon',
    exercised: false,
    startTime: '18:00',
    energyLevel: 'normal',
    dayType: 'listening_focus',
    workdayBonus: { passiveListeningMinutes: 0 },
    tasks: [],
    stoppedAfter2230: false,
    noCompensatoryStayingUp: false,
    tomorrowFirstStep: '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  it.each([
    ['notes', 'Reviewed listening mistakes'],
    ['tomorrowFirstStep', 'Review three difficult sentences'],
    ['bedtime', '22:15'],
  ] as const)('makes a History %s edit uploadable and readable on another device', (field, value) => {
    vi.useFakeTimers();
    const now = '2026-11-26T04:00:00.000Z';
    vi.setSystemTime(new Date(now));
    const original = {
      ...createDummyRecord('2026-11-25'),
      createdAt: '2026-11-25T10:00:00.000Z',
      updatedAt: '2026-11-25T12:00:00.000Z',
    };
    const untouched = createDummyRecord('2026-11-24');
    localStorage.getItem = vi.fn(() => JSON.stringify({ records: {
      [original.date]: original,
      [untouched.date]: untouched,
    } }));
    const { updateRecord } = useAppData();
    updateRecord(original.date, (prev) => ({ ...prev!, [field]: value }));
    const state = mockStates[0].data;
    const edited = state.records[original.date];
    expect(edited.updatedAt).toBe(now);
    expect(edited.createdAt).toBe(original.createdAt);
    expect(edited[field]).toBe(value);
    expect(state.records[untouched.date]).toEqual(untouched);

    const cloud = [{ date_key: original.date, updated_at: original.updatedAt, record_json: original }];
    const result = mergeLocalAndCloudRecords(state, cloud, 'editing-device');
    const upload = result.recordsToUpload.find((item) => item.date_key === original.date);
    expect(upload?.record_json[field]).toBe(value);
    expect(upload?.updated_at).toBe(now);
    const otherDevice = mergeLocalAndCloudRecords({ records: {} }, [upload], 'other-device');
    expect(otherDevice.mergedState.records[original.date][field]).toBe(value);
  });

  it('keeps edit timestamps increasing within a millisecond and after clock rollback', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T04:00:00.000Z'));
    const { updateRecord } = useAppData();
    const date = '2026-11-25';
    updateRecord(date, () => createDummyRecord(date));
    const createdAt = mockStates[0].data.records[date].createdAt;
    const firstTimestamp = mockStates[0].data.records[date].updatedAt;
    updateRecord(date, (prev) => ({ ...prev!, notes: 'First edit' }));
    const nextTimestamp = mockStates[0].data.records[date].updatedAt;
    expect(Date.parse(nextTimestamp)).toBe(Date.parse(firstTimestamp) + 1);
    vi.setSystemTime(new Date('2026-11-25T04:00:00.000Z'));
    updateRecord(date, (prev) => ({ ...prev!, notes: 'Second edit' }));
    expect(Date.parse(mockStates[0].data.records[date].updatedAt)).toBe(Date.parse(nextTimestamp) + 1);
    expect(mockStates[0].data.records[date].createdAt).toBe(createdAt);
  });

  it('preserves source timestamps when importing or replacing synchronized records', () => {
    const { importData, replaceData } = useAppData();
    const original = { ...createDummyRecord('2026-07-05'), updatedAt: '2026-07-05T12:00:00.000Z' };
    const state = { records: { [original.date]: original } };
    importData(state);
    expect(mockStates[0].data.records[original.date].updatedAt).toBe(original.updatedAt);
    replaceData(state);
    expect(mockStates[0].data.records[original.date].updatedAt).toBe(original.updatedAt);
  });

  it('deleteRecord writes sync.deletedRecords for valid dates', () => {
    const { updateRecord, deleteRecord } = useAppData();

    updateRecord('2026-05-19', () => createDummyRecord('2026-05-19'));
    expect(mockStates[0].data.records['2026-05-19']).toBeDefined();

    deleteRecord('2026-5-19');

    expect(mockStates[0].data.records['2026-5-19']).toBeUndefined();
    expect(mockStates[0].data.records['2026-05-19']).toBeUndefined();
    expect(mockStates[0].data.sync?.deletedRecords?.['2026-05-19']).toBeDefined();
  });

  it('deleteRecord does not write tombstone for invalid dates', () => {
    const { deleteRecord } = useAppData();

    deleteRecord('invalid-date');
    expect(mockStates[0].data.sync?.deletedRecords?.['invalid-date']).toBeUndefined();
  });

  it('clearData does not generate tombstone', () => {
    const { updateRecord, clearData } = useAppData();

    updateRecord('2026-05-19', () => createDummyRecord('2026-05-19'));
    expect(mockStates[0].data.records['2026-05-19']).toBeDefined();

    clearData();
    expect(Object.keys(mockStates[0].data.records).length).toBe(0);
    expect(mockStates[0].data.sync).toBeUndefined();
  });

  it.each(['import', 'clear'])('ignores an earlier sync response after %s replaces local data', (action) => {
    const hook = useAppData();
    const source = { records: {} };
    if (action === 'import') hook.importData(source);
    else hook.clearData();
    hook.replaceData({ records: { stale: createDummyRecord('2026-05-19') } }, source);
    expect(mockStates[0].data.records).toEqual({});
  });

  it('saveRewardGoal creates reward settings with generated metadata', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T08:00:00.000Z'));
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'reward-goal-1') });

    const { saveRewardGoal } = useAppData();

    saveRewardGoal({
      title: 'Hotpot dinner',
      targetPoints: 20,
      note: 'After a solid study streak',
    });

    expect(mockStates[0].data.rewards).toEqual({
      schemaVersion: 1,
      updatedAt: '2026-07-10T08:00:00.000Z',
      activeGoal: {
        id: 'reward-goal-1',
        title: 'Hotpot dinner',
        targetPoints: 20,
        note: 'After a solid study streak',
        createdAt: '2026-07-10T08:00:00.000Z',
      },
    });
  });

  it('saveRewardGoal updates an existing active goal without changing its identity', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T08:00:00.000Z'));
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'reward-goal-1') });

    const { saveRewardGoal } = useAppData();

    saveRewardGoal({ title: 'Hotpot dinner', targetPoints: 20 });
    vi.setSystemTime(new Date('2026-07-11T08:00:00.000Z'));
    saveRewardGoal({ title: 'New headphones', targetPoints: 30, note: '' });

    expect(mockStates[0].data.rewards?.activeGoal).toEqual({
      id: 'reward-goal-1',
      title: 'New headphones',
      targetPoints: 30,
      createdAt: '2026-07-10T08:00:00.000Z',
    });
  });

  it('clearRewardGoal removes only the active reward goal', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T08:00:00.000Z'));
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'reward-goal-1') });

    const { saveRewardGoal, clearRewardGoal } = useAppData();

    saveRewardGoal({ title: 'Hotpot dinner', targetPoints: 20 });
    clearRewardGoal();

    expect(mockStates[0].data.rewards).toEqual({ schemaVersion: 1, updatedAt: '2026-07-10T08:00:00.001Z' });
    vi.setSystemTime(new Date('2026-07-09T08:00:00.000Z'));
    saveRewardGoal({ title: 'Next goal', targetPoints: 10 });
    expect(mockStates[0].data.rewards.updatedAt).toBe('2026-07-10T08:00:00.002Z');
  });
});

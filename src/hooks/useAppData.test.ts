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
});

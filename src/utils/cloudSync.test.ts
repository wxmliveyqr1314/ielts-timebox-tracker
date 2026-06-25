import { describe, it, expect } from 'vitest';
import { mergeLocalAndCloudRecords } from './cloudSync';
import { AppState, DailyRecord } from '../types';

function createDummyRecord(date: string, updatedAt: string): DailyRecord {
  return {
    date,
    updatedAt,
    weekday: 'Monday',
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
    createdAt: updatedAt,
  };
}

describe('mergeLocalAndCloudRecords', () => {
  const deviceId = 'test-device-id';

  it('uploads local records if cloud is empty', () => {
    const localState: AppState = {
      records: {
        '2026-05-19': createDummyRecord('2026-05-19', '2026-05-19T10:00:00Z'),
      }
    };
    const { uploaded, downloaded, skipped, mergedState, recordsToUpload } = mergeLocalAndCloudRecords(localState, [], deviceId);
    expect(uploaded).toBe(1);
    expect(downloaded).toBe(0);
    expect(skipped).toBe(0);
    expect(recordsToUpload.length).toBe(1);
    expect(mergedState.records['2026-05-19']).toBeDefined();
    expect(mergedState.sync?.deviceId).toBe(deviceId);
  });

  it('downloads cloud records if local is empty', () => {
    const localState: AppState = { records: {} };
    const cloudRecords = [
      {
        date_key: '2026-05-19',
        updated_at: '2026-05-19T10:00:00Z',
        record_json: createDummyRecord('2026-05-19', '2026-05-19T10:00:00Z')
      }
    ];
    const { uploaded, downloaded, skipped, mergedState } = mergeLocalAndCloudRecords(localState, cloudRecords, deviceId);
    expect(uploaded).toBe(0);
    expect(downloaded).toBe(1);
    expect(skipped).toBe(0);
    expect(mergedState.records['2026-05-19']).toBeDefined();
  });

  it('uploads if local is newer', () => {
    const localState: AppState = {
      records: {
        '2026-05-19': createDummyRecord('2026-05-19', '2026-05-19T12:00:00Z'), // newer
      }
    };
    const cloudRecords = [
      {
        date_key: '2026-05-19',
        updated_at: '2026-05-19T10:00:00Z',
        record_json: createDummyRecord('2026-05-19', '2026-05-19T10:00:00Z')
      }
    ];
    const { uploaded, downloaded, skipped, mergedState } = mergeLocalAndCloudRecords(localState, cloudRecords, deviceId);
    expect(uploaded).toBe(1);
    expect(downloaded).toBe(0);
    expect(skipped).toBe(0);
    expect(mergedState.records['2026-05-19'].updatedAt).toBe('2026-05-19T12:00:00Z');
  });

  it('downloads if cloud is newer', () => {
    const localState: AppState = {
      records: {
        '2026-05-19': createDummyRecord('2026-05-19', '2026-05-19T10:00:00Z'),
      }
    };
    const cloudRecords = [
      {
        date_key: '2026-05-19',
        updated_at: '2026-05-19T12:00:00Z', // newer
        record_json: createDummyRecord('2026-05-19', '2026-05-19T12:00:00Z')
      }
    ];
    const { uploaded, downloaded, skipped, mergedState } = mergeLocalAndCloudRecords(localState, cloudRecords, deviceId);
    expect(uploaded).toBe(0);
    expect(downloaded).toBe(1);
    expect(skipped).toBe(0);
    expect(mergedState.records['2026-05-19'].updatedAt).toBe('2026-05-19T12:00:00Z');
  });

  it('skips if updatedAt is identical', () => {
    const localState: AppState = {
      records: {
        '2026-05-19': createDummyRecord('2026-05-19', '2026-05-19T10:00:00Z'),
      }
    };
    const cloudRecords = [
      {
        date_key: '2026-05-19',
        updated_at: '2026-05-19T10:00:00Z',
        record_json: createDummyRecord('2026-05-19', '2026-05-19T10:00:00Z')
      }
    ];
    const { uploaded, downloaded, skipped } = mergeLocalAndCloudRecords(localState, cloudRecords, deviceId);
    expect(uploaded).toBe(0);
    expect(downloaded).toBe(0);
    expect(skipped).toBe(1);
  });

  it('ignores invalid local dates', () => {
    const localState: AppState = {
      records: {
        'invalid-date': createDummyRecord('invalid-date', '2026-05-19T10:00:00Z'),
      }
    };
    const { mergedState } = mergeLocalAndCloudRecords(localState, [], deviceId);
    expect(Object.keys(mergedState.records).length).toBe(0);
  });

  it('normalizes YYYY-M-D and YYYY-MM-DD to same key', () => {
    const localState: AppState = {
      records: {
        '2026-5-1': createDummyRecord('2026-5-1', '2026-05-01T10:00:00Z'),
        '2026-05-01': createDummyRecord('2026-05-01', '2026-05-01T12:00:00Z'), // newer
      }
    };
    const { mergedState } = mergeLocalAndCloudRecords(localState, [], deviceId);
    expect(Object.keys(mergedState.records).length).toBe(1);
    expect(mergedState.records['2026-05-01']).toBeDefined();
    expect(mergedState.records['2026-05-01'].updatedAt).toBe('2026-05-01T12:00:00Z');
  });

  it('does not mutate original localState input', () => {
    const localState: AppState = {
      records: {
        '2026-05-19': createDummyRecord('2026-05-19', '2026-05-19T10:00:00Z'),
      }
    };
    const localStateCopy = JSON.parse(JSON.stringify(localState));
    mergeLocalAndCloudRecords(localState, [], deviceId);
    expect(localState).toEqual(localStateCopy);
  });
});

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

  it('normalizes YYYY-M-D and YYYY-MM-DD to same key using record.date', () => {
    const localState: AppState = {
      records: {
        'some-weird-key': createDummyRecord('2026-5-1', '2026-05-01T10:00:00Z'),
        '2026-05-01': createDummyRecord('2026-05-01', '2026-05-01T12:00:00Z'), // newer
      }
    };
    const { mergedState } = mergeLocalAndCloudRecords(localState, [], deviceId);
    expect(Object.keys(mergedState.records).length).toBe(1);
    expect(mergedState.records['2026-05-01']).toBeDefined();
    expect(mergedState.records['2026-05-01'].updatedAt).toBe('2026-05-01T12:00:00Z');
  });

  it('deletes local record if cloud tombstone is newer', () => {
    const localState: AppState = {
      records: {
        '2026-05-19': createDummyRecord('2026-05-19', '2026-05-19T10:00:00Z'),
      }
    };
    const cloudRecords = [
      {
        date_key: '2026-05-19',
        updated_at: '2026-05-19T12:00:00Z',
        deleted_at: '2026-05-19T12:00:00Z',
        record_json: createDummyRecord('2026-05-19', '2026-05-19T12:00:00Z') // Even if there is json payload, it should be treated as deleted
      }
    ];
    const { downloaded, mergedState } = mergeLocalAndCloudRecords(localState, cloudRecords, deviceId);
    expect(downloaded).toBe(1);
    expect(mergedState.records['2026-05-19']).toBeUndefined();
    expect(mergedState.sync?.deletedRecords?.['2026-05-19']).toBe('2026-05-19T12:00:00Z');
  });

  it('does not download cloud tombstone as a normal record if cloud updated_at > local.updatedAt', () => {
    const localState: AppState = {
      records: {
        '2026-05-19': createDummyRecord('2026-05-19', '2026-05-19T10:00:00Z'),
      }
    };
    const cloudRecords = [
      {
        date_key: '2026-05-19',
        updated_at: '2026-05-19T14:00:00Z',
        deleted_at: '2026-05-19T12:00:00Z', // tombstone but for some reason updated_at is even newer
        record_json: createDummyRecord('2026-05-19', '2026-05-19T14:00:00Z')
      }
    ];
    const { downloaded, mergedState } = mergeLocalAndCloudRecords(localState, cloudRecords, deviceId);
    expect(downloaded).toBe(1);
    expect(mergedState.records['2026-05-19']).toBeUndefined(); // MUST NOT exist as normal record
    expect(mergedState.sync?.deletedRecords?.['2026-05-19']).toBe('2026-05-19T12:00:00Z');
  });

  it('uploads local tombstone if it is newer than cloud record', () => {
    const localState: AppState = {
      records: {},
      sync: {
        schemaVersion: 1,
        deviceId,
        deletedRecords: {
          '2026-05-19': '2026-05-19T12:00:00Z'
        }
      }
    };
    const cloudRecords = [
      {
        date_key: '2026-05-19',
        updated_at: '2026-05-19T10:00:00Z',
        record_json: createDummyRecord('2026-05-19', '2026-05-19T10:00:00Z')
      }
    ];
    const { uploaded, downloaded, mergedState, recordsToUpload } = mergeLocalAndCloudRecords(localState, cloudRecords, deviceId);
    expect(uploaded).toBe(1);
    expect(downloaded).toBe(0);
    expect(mergedState.records['2026-05-19']).toBeUndefined();
    expect(recordsToUpload[0].deleted_at).toBe('2026-05-19T12:00:00Z');
  });

  it('does not download cloud tombstone as a normal record if local is empty', () => {
    const localState: AppState = { records: {} };
    const cloudRecords = [
      {
        date_key: '2026-05-19',
        updated_at: '2026-05-19T10:00:00Z',
        deleted_at: '2026-05-19T10:00:00Z',
        record_json: {}
      }
    ];
    const { downloaded, mergedState } = mergeLocalAndCloudRecords(localState, cloudRecords, deviceId);
    expect(downloaded).toBe(1); // it downloads the tombstone metadata
    expect(mergedState.records['2026-05-19']).toBeUndefined();
    expect(mergedState.sync?.deletedRecords?.['2026-05-19']).toBe('2026-05-19T10:00:00Z');
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

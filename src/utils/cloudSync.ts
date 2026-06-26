import { AppState, DailyRecord } from '../types';
import { normalizeDateString } from './date';
import { SupabaseClient } from '@supabase/supabase-js';

export function mergeLocalAndCloudRecords(
  localState: AppState,
  cloudRecords: any[],
  deviceId: string
): {
  mergedState: AppState;
  uploaded: number;
  downloaded: number;
  skipped: number;
  recordsToUpload: any[];
} {
  const mergedState = JSON.parse(JSON.stringify(localState)) as AppState;
  
  if (!mergedState.sync) {
    mergedState.sync = { schemaVersion: 1, deviceId };
  }
  if (!mergedState.sync.deletedRecords) {
    mergedState.sync.deletedRecords = {};
  }
  
  // ensure valid date keys
  const newRecords: Record<string, DailyRecord> = {};
  for (const [k, v] of Object.entries(mergedState.records || {})) {
    const targetDateStr = v.date || k; // fallback to k
    const norm = normalizeDateString(targetDateStr);
    if (norm) {
      v.date = norm;
      if (newRecords[norm]) {
        const time1 = new Date(v.updatedAt).getTime();
        const time2 = new Date(newRecords[norm].updatedAt).getTime();
        if (time1 > time2) {
          newRecords[norm] = v;
        }
      } else {
        newRecords[norm] = v;
      }
    }
  }
  mergedState.records = newRecords;

  const cloudMap = new Map<string, any>();
  for (const r of cloudRecords) {
    cloudMap.set(r.date_key, r);
  }

  let uploaded = 0;
  let downloaded = 0;
  let skipped = 0;
  const recordsToUpload: any[] = [];
  const localDeleted = mergedState.sync.deletedRecords;
  const processedDates = new Set<string>();

  for (const [dateKey, localRec] of Object.entries(mergedState.records)) {
    processedDates.add(dateKey);
    const cloudRec = cloudMap.get(dateKey);
    const localTime = new Date(localRec.updatedAt).getTime();

    if (cloudRec) {
      const cloudTime = new Date(cloudRec.updated_at).getTime();
      const cloudDeletedTime = cloudRec.deleted_at ? new Date(cloudRec.deleted_at).getTime() : 0;
      
      if (cloudDeletedTime > localTime) {
        delete mergedState.records[dateKey];
        localDeleted[dateKey] = cloudRec.deleted_at;
        downloaded++;
      } else if (localTime > cloudTime && localTime > cloudDeletedTime) {
        recordsToUpload.push({ date_key: dateKey, record_json: localRec, updated_at: localRec.updatedAt });
        uploaded++;
      } else if (cloudTime > localTime) {
        mergedState.records[dateKey] = cloudRec.record_json;
        delete localDeleted[dateKey];
        downloaded++;
      } else {
        skipped++;
      }
    } else {
      recordsToUpload.push({ date_key: dateKey, record_json: localRec, updated_at: localRec.updatedAt });
      uploaded++;
    }
    cloudMap.delete(dateKey);
  }

  for (const [dateKey, deletedAt] of Object.entries(localDeleted)) {
    if (processedDates.has(dateKey)) continue;

    const cloudRec = cloudMap.get(dateKey);
    const localDeletedTime = new Date(deletedAt).getTime();

    if (cloudRec) {
      const cloudTime = new Date(cloudRec.updated_at).getTime();
      const cloudDeletedTime = cloudRec.deleted_at ? new Date(cloudRec.deleted_at).getTime() : 0;

      if (localDeletedTime > cloudTime && localDeletedTime > cloudDeletedTime) {
        recordsToUpload.push({ date_key: dateKey, record_json: {}, updated_at: deletedAt, deleted_at: deletedAt });
        uploaded++;
      } else if (cloudTime > localDeletedTime && cloudDeletedTime === 0) {
        mergedState.records[dateKey] = cloudRec.record_json;
        delete localDeleted[dateKey];
        downloaded++;
      } else if (cloudDeletedTime > localDeletedTime) {
        localDeleted[dateKey] = cloudRec.deleted_at;
        downloaded++;
      } else {
        skipped++;
      }
      cloudMap.delete(dateKey);
    } else {
      recordsToUpload.push({ date_key: dateKey, record_json: {}, updated_at: deletedAt, deleted_at: deletedAt });
      uploaded++;
    }
  }

  for (const [dateKey, cloudRec] of cloudMap.entries()) {
    if (cloudRec.deleted_at) {
      localDeleted[dateKey] = cloudRec.deleted_at;
      downloaded++;
    } else {
      mergedState.records[dateKey] = cloudRec.record_json;
      downloaded++;
    }
  }

  return { mergedState, uploaded, downloaded, skipped, recordsToUpload };
}

export async function syncDailyRecords({
  localState,
  userId,
  deviceId,
  supabase
}: {
  localState: AppState;
  userId: string;
  deviceId: string;
  supabase: SupabaseClient;
}): Promise<{
  mergedState: AppState;
  uploaded: number;
  downloaded: number;
  skipped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  
  try {
    const { data: cloudRecords, error: fetchError } = await supabase
      .from('daily_records')
      .select('*')
      .eq('user_id', userId);
      
    if (fetchError) {
      errors.push(`Fetch error: ${fetchError.message}`);
      return { mergedState: localState, uploaded: 0, downloaded: 0, skipped: 0, errors };
    }

    const mergeResult = mergeLocalAndCloudRecords(localState, cloudRecords || [], deviceId);
    const { mergedState, uploaded, downloaded, skipped, recordsToUpload } = mergeResult;

    if (recordsToUpload.length > 0) {
      const upsertPayload = recordsToUpload.map(r => ({
        user_id: userId,
        date_key: r.date_key,
        record_json: r.record_json || {},
        schema_version: 1,
        updated_at: r.updated_at,
        deleted_at: r.deleted_at || null,
        device_id: deviceId
      }));

      const { error: upsertError } = await supabase
        .from('daily_records')
        .upsert(upsertPayload, { onConflict: 'user_id, date_key' });

      if (upsertError) {
        errors.push(`Upload error: ${upsertError.message}`);
        return { mergedState: localState, uploaded: 0, downloaded: 0, skipped: 0, errors };
      }
    }

    mergedState.sync!.lastSyncAt = new Date().toISOString();
    return { mergedState, uploaded, downloaded, skipped, errors };
  } catch (err: any) {
    errors.push(err.message || 'Unknown sync error');
    return { mergedState: localState, uploaded: 0, downloaded: 0, skipped: 0, errors };
  }
}

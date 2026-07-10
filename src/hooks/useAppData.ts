import { useState, useEffect } from "react";
import { AppState, DailyRecord, RewardGoalDraft } from "../types";
import { normalizeDateString } from "../utils/date";

const STORAGE_KEY = "ielts_timebox_state_v2";

const defaultState: AppState = {
  records: {},
};

export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem("ielts_timebox_device_id");
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    localStorage.setItem("ielts_timebox_device_id", id);
  }
  return id;
}

function createId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
}

const loadState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { data: JSON.parse(stored) as AppState, corrupted: false };
    }
  } catch (e) {
    console.warn("Failed to load state from localStorage", e);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        localStorage.setItem("ielts_timebox_tracker_corrupt_backup_v1", stored);
        alert("本地数据读取失败 (JSON 损坏)。损坏的数据已备份。安全模式下不会立即覆盖原始损坏数据。");
      } catch (backupError) {
        console.error("Failed to backup corrupt data", backupError);
      }
    }
    return { data: defaultState, corrupted: true };
  }
  return { data: defaultState, corrupted: false };
};

export function useAppData() {
  const [appState, setAppState] = useState(() => loadState());
  const [hasMutated, setHasMutated] = useState(false);
  const data = appState.data;

  useEffect(() => {
    if (appState.corrupted && !hasMutated) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to save state to localStorage", e);
    }
  }, [data, appState.corrupted, hasMutated]);

  const updateRecord = (
    date: string,
    recordUpdater: (prev: DailyRecord | undefined) => DailyRecord,
  ) => {
    setHasMutated(true);
    setAppState((prev) => {
      const newRecord = recordUpdater(prev.data.records[date]);
      return {
        ...prev,
        data: {
          ...prev.data,
          records: {
            ...prev.data.records,
            [date]: newRecord,
          },
        }
      };
    });
  };

  const deleteRecord = (date: string) => {
    setHasMutated(true);
    setAppState((prev) => {
      const newRecords = { ...prev.data.records };
      delete newRecords[date];

      const norm = normalizeDateString(date);
      if (norm && norm !== date) {
        delete newRecords[norm];
      }

      const newData = { ...prev.data, records: newRecords };

      if (norm) {
        if (!newData.sync) {
          newData.sync = { schemaVersion: 1, deviceId: getOrCreateDeviceId(), deletedRecords: {} };
        }
        if (!newData.sync.deletedRecords) {
          newData.sync.deletedRecords = {};
        }
        newData.sync.deletedRecords[norm] = new Date().toISOString();
      }

      return {
        ...prev,
        data: newData
      };
    });
  };

  const importData = (importedState: AppState) => {
    setHasMutated(true);
    setAppState(prev => ({ ...prev, data: importedState }));
  };

  const clearData = () => {
    setHasMutated(true);
    setAppState(prev => ({ ...prev, data: defaultState }));
  };

  const replaceData = (nextState: AppState) => {
    setHasMutated(true);
    setAppState(prev => ({ ...prev, data: nextState }));
  };

  const saveRewardGoal = (draft: RewardGoalDraft) => {
    setHasMutated(true);
    setAppState((prev) => {
      const existingGoal = prev.data.rewards?.activeGoal;
      const note = draft.note?.trim();

      return {
        ...prev,
        data: {
          ...prev.data,
          rewards: {
            schemaVersion: 1,
            activeGoal: {
              id: existingGoal?.id ?? createId(),
              title: draft.title.trim(),
              targetPoints: draft.targetPoints,
              ...(note ? { note } : {}),
              createdAt: existingGoal?.createdAt ?? new Date().toISOString(),
            },
          },
        },
      };
    });
  };

  const clearRewardGoal = () => {
    setHasMutated(true);
    setAppState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        rewards: { schemaVersion: 1 },
      },
    }));
  };

  return {
    data,
    updateRecord,
    deleteRecord,
    importData,
    clearData,
    replaceData,
    saveRewardGoal,
    clearRewardGoal,
  };
}

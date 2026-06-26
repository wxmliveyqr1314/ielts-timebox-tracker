import { useState, useEffect } from "react";
import { AppState, DailyRecord } from "../types";

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
      return {
        ...prev,
        data: {
          ...prev.data,
          records: newRecords,
        }
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

  return { data, updateRecord, deleteRecord, importData, clearData, replaceData };
}

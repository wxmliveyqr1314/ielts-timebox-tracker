import { useState, useEffect } from "react";
import { AppState, DailyRecord } from "../types";

const STORAGE_KEY = "ielts_timebox_state_v2";

const defaultState: AppState = {
  records: {},
};

export function useAppData() {
  const [data, setData] = useState<AppState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as AppState;
      }
    } catch (e) {
      console.warn("Failed to load state from localStorage", e);
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          localStorage.setItem("ielts_timebox_tracker_corrupt_backup_v1", stored);
          alert("本地数据读取失败 (JSON 损坏)。损坏的数据已备份到系统剪贴板/备份区，应用将进入初始空数据状态。请及时导出备份！");
        } catch (backupError) {
          console.error("Failed to backup corrupt data", backupError);
        }
      }
    }
    return defaultState;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to save state to localStorage", e);
    }
  }, [data]);

  const updateRecord = (
    date: string,
    recordUpdater: (prev: DailyRecord | undefined) => DailyRecord,
  ) => {
    setData((prev) => {
      const newRecord = recordUpdater(prev.records[date]);
      return {
        ...prev,
        records: {
          ...prev.records,
          [date]: newRecord,
        },
      };
    });
  };

  const deleteRecord = (date: string) => {
    setData((prev) => {
      const newRecords = { ...prev.records };
      delete newRecords[date];
      return {
        ...prev,
        records: newRecords,
      };
    });
  };

  const importData = (importedState: AppState) => {
    setData(importedState);
  };

  const clearData = () => {
    setData(defaultState);
  };

  return { data, updateRecord, deleteRecord, importData, clearData };
}

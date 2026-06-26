import { describe, it, expect } from "vitest";
import { analyzeAppDataHealth } from "./dataHealth";
import { AppState, DailyRecord } from "../types";

function createValidRecord(date: string): DailyRecord {
  return {
    date,
    weekday: "Mon",
    exercised: false,
    startTime: "18:00",
    energyLevel: "normal",
    dayType: "listening_focus",
    workdayBonus: { passiveListeningMinutes: 0 },
    tasks: [{ id: "1", title: "T", category: "other", plannedMinutes: 0, actualMinutes: 0, completed: false, isCore: false, isEveningTask: false }],
    stoppedAfter2230: false,
    noCompensatoryStayingUp: false,
    tomorrowFirstStep: "",
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

describe("analyzeAppDataHealth", () => {
  it("returns ok for healthy data", () => {
    const appData: AppState = {
      records: {
        "2026-05-09": createValidRecord("2026-05-09")
      }
    };
    const report = analyzeAppDataHealth(appData);
    expect(report.ok).toBe(true);
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });

  it("identifies invalid record key", () => {
    const appData: AppState = {
      records: {
        "invalid-date": createValidRecord("invalid-date")
      }
    };
    const report = analyzeAppDataHealth(appData);
    expect(report.ok).toBe(false);
    expect(report.issues.some(i => i.code === "INVALID_RECORD_KEY")).toBe(true);
  });

  it("identifies missing or non-string date field", () => {
    const rec = createValidRecord("2026-05-09");
    delete (rec as any).date;
    const appData: AppState = {
      records: {
        "2026-05-09": rec
      }
    };
    const report = analyzeAppDataHealth(appData);
    expect(report.ok).toBe(false);
    expect(report.issues.some(i => i.code === "INVALID_RECORD_DATE")).toBe(true);
  });

  it("identifies unnormalized key", () => {
    const appData: AppState = {
      records: {
        "2026-5-9": createValidRecord("2026-5-9")
      }
    };
    const report = analyzeAppDataHealth(appData);
    expect(report.ok).toBe(false);
    expect(report.issues.some(i => i.code === "KEY_NOT_NORMALIZED")).toBe(true);
  });

  it("identifies duplicate normalized keys", () => {
    const appData: AppState = {
      records: {
        "2026-05-09": createValidRecord("2026-05-09"),
        "2026-5-9": createValidRecord("2026-5-9")
      }
    };
    const report = analyzeAppDataHealth(appData);
    expect(report.ok).toBe(false);
    expect(report.issues.some(i => i.code === "DUPLICATE_NORMALIZED_KEYS")).toBe(true);
  });

  it("identifies missing or invalid updatedAt", () => {
    const rec = createValidRecord("2026-05-09");
    rec.updatedAt = "invalid-date";
    const appData: AppState = {
      records: {
        "2026-05-09": rec
      }
    };
    const report = analyzeAppDataHealth(appData);
    expect(report.issues.some(i => i.code === "INVALID_UPDATED_AT")).toBe(true);
  });

  it("identifies invalid status", () => {
    const rec = createValidRecord("2026-05-09");
    rec.status = "unknown" as any;
    const appData: AppState = {
      records: {
        "2026-05-09": rec
      }
    };
    const report = analyzeAppDataHealth(appData);
    expect(report.issues.some(i => i.code === "INVALID_STATUS")).toBe(true);
  });

  it("identifies negative task minutes", () => {
    const rec = createValidRecord("2026-05-09");
    rec.tasks[0].actualMinutes = -5;
    const appData: AppState = {
      records: {
        "2026-05-09": rec
      }
    };
    const report = analyzeAppDataHealth(appData);
    expect(report.issues.some(i => i.code === "TASK_INVALID_ACTUAL_MINUTES")).toBe(true);
  });

  it("identifies invalid deletedRecords key", () => {
    const appData: AppState = {
      records: {},
      sync: {
        schemaVersion: 1,
        deviceId: "test",
        deletedRecords: {
          "invalid-date": new Date().toISOString()
        }
      }
    };
    const report = analyzeAppDataHealth(appData);
    expect(report.issues.some(i => i.code === "INVALID_DELETED_RECORD_KEY")).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { analyzeAppDataHealth } from "./dataHealth";
import { AppState, DailyRecord } from "../types";
import { buildDailyPlan } from "../planning/planEngine";

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

function createDynamicRecord(date: string): DailyRecord {
  const record = createValidRecord(date);
  const result = buildDailyPlan({
    dayContext: "workday",
    exercised: false,
    energyLevel: "normal",
    dayType: "listening_focus",
    workdayBonus: {
      passiveListeningMinutes: 0,
      momoMinutes: 0,
      dictationMinutes: 0,
      readingMinutes: 0,
    },
  });
  return {
    ...record,
    dayContext: "workday",
    tasks: result.tasks,
    planSnapshot: {
      ...result.snapshot,
      generatedAt: `${date}T12:00:00.000Z`,
    },
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

  it("keeps legacy records without a plan snapshot healthy", () => {
    const record = createValidRecord("2026-05-09");
    const report = analyzeAppDataHealth({ records: { [record.date]: record } });
    expect(report.ok).toBe(true);
    expect(report.issues.some((issue) => issue.code.startsWith("PLAN_"))).toBe(false);
  });

  it("keeps a valid dynamic plan snapshot healthy", () => {
    const record = createDynamicRecord("2026-05-09");
    const report = analyzeAppDataHealth({ records: { [record.date]: record } });
    expect(report.ok).toBe(true);
  });

  it("identifies an unsupported planning engine version", () => {
    const record = createDynamicRecord("2026-05-09");
    (record.planSnapshot as any).engineVersion = 99;
    const report = analyzeAppDataHealth({ records: { [record.date]: record } });
    expect(report.issues.some((issue) => issue.code === "INVALID_PLAN_ENGINE_VERSION")).toBe(true);
  });

  it("identifies negative values in a present plan summary", () => {
    const record = createDynamicRecord("2026-05-09");
    record.planSnapshot!.summary.eveningCoreTargetMinutes = -1;
    const report = analyzeAppDataHealth({ records: { [record.date]: record } });
    expect(report.issues.some((issue) => issue.code === "INVALID_PLAN_SUMMARY")).toBe(true);
  });

  it("warns when record plan inputs differ from the saved snapshot", () => {
    const record = createDynamicRecord("2026-05-09");
    record.dayContext = "rest_day";
    const report = analyzeAppDataHealth({ records: { [record.date]: record } });
    const issue = report.issues.find((candidate) => candidate.code === "PLAN_INPUT_MISMATCH");
    expect(issue?.severity).toBe("warning");
  });

  it("identifies missing fields inside a present plan snapshot", () => {
    const record = createDynamicRecord("2026-05-09");
    delete (record.planSnapshot as any).summary;
    const report = analyzeAppDataHealth({ records: { [record.date]: record } });
    expect(report.issues.some((issue) => issue.code === "PLAN_SNAPSHOT_MISSING_FIELDS")).toBe(true);
  });

  it("accepts valid stretch metadata and keeps legacy records healthy", () => {
    const legacy = createValidRecord("2026-07-05");
    const stretch = createValidRecord("2026-07-06");
    const result = buildDailyPlan({
      dayContext: "workday",
      exercised: false,
      energyLevel: "normal",
      dayType: "listening_focus",
      workdayBonus: { passiveListeningMinutes: 0 },
      stretchEnabled: true,
      stretchStrategy: "same_focus",
    });
    stretch.dayContext = "workday";
    stretch.tasks = result.tasks;
    stretch.planSnapshot = {
      ...result.snapshot,
      generatedAt: "2026-07-06T12:00:00.000Z",
    };

    const report = analyzeAppDataHealth({
      records: {
        [legacy.date]: legacy,
        [stretch.date]: stretch,
      },
    });

    expect(report.ok).toBe(true);
  });

  it("identifies invalid stretch metadata fields", () => {
    const record = createValidRecord("2026-07-06");
    const result = buildDailyPlan({
      dayContext: "workday",
      exercised: false,
      energyLevel: "normal",
      dayType: "listening_focus",
      workdayBonus: { passiveListeningMinutes: 0 },
      stretchEnabled: true,
      stretchStrategy: "same_focus",
    });
    record.dayContext = "workday";
    record.tasks = result.tasks;
    record.planSnapshot = {
      ...result.snapshot,
      generatedAt: "2026-07-06T12:00:00.000Z",
      stretch: {
        enabled: "yes",
        strategy: "custom",
        budgetMinutes: -1,
        plannedMinutes: Number.NaN,
      } as any,
    };

    const report = analyzeAppDataHealth({
      records: { [record.date]: record },
    });
    const codes = report.issues.map((issue) => issue.code);

    expect(codes).toContain("PLAN_STRETCH_INVALID_ENABLED");
    expect(codes).toContain("PLAN_STRETCH_INVALID_STRATEGY");
    expect(codes).toContain("PLAN_STRETCH_INVALID_BUDGET");
    expect(codes).toContain("PLAN_STRETCH_INVALID_PLANNED");
  });
});

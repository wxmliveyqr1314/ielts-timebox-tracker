import { describe, expect, it } from "vitest";
import type { DailyRecord, DayStatus, TaskCheckItem } from "../types";
import {
  calculateRecordRewardPoints,
  calculateRewardSummary,
  formatPoints,
} from "./rewardPoints";

function task(overrides: Partial<TaskCheckItem> = {}): TaskCheckItem {
  return {
    id: "task",
    title: "Task",
    category: "momo",
    plannedMinutes: 20,
    actualMinutes: 0,
    completed: false,
    isCore: true,
    isEveningTask: true,
    ...overrides,
  };
}

function record(
  date: string,
  status: DayStatus,
  overrides: Partial<DailyRecord> = {},
): DailyRecord {
  return {
    date,
    weekday: "Friday",
    exercised: false,
    startTime: "18:00",
    energyLevel: "normal",
    dayType: "listening_focus",
    dayContext: "workday",
    workdayBonus: { passiveListeningMinutes: 0 },
    tasks: [],
    stoppedAfter2230: true,
    noCompensatoryStayingUp: true,
    tomorrowFirstStep: "",
    status,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
    ...overrides,
  };
}

function stretchRecord(
  status: DayStatus,
  actualMinutes: number,
  plannedMinutes = 40,
): DailyRecord {
  return record("2026-07-10", status, {
    planSnapshot: {
      engineVersion: 2,
      generatedAt: "2026-07-10T00:00:00.000Z",
      input: {
        exercised: false,
        energyLevel: "normal",
        dayType: "listening_focus",
        dayContext: "workday",
        workdayBonus: { passiveListeningMinutes: 0 },
        stretchEnabled: true,
        stretchStrategy: "same_focus",
      },
      credits: [],
      summary: {
        standardCoreMinutes: 175,
        energyAdjustedCoreMinutes: 175,
        appliedCoreCreditMinutes: 0,
        extraCompletedMinutes: 0,
        capacityMinutes: 270,
        capacityTrimmedMinutes: 0,
        eveningCoreTargetMinutes: 175,
        passiveReferenceMinutes: 60,
        passiveReferenceRemainingMinutes: 60,
      },
      adjustmentCodes: ["stretch_enabled"],
      stretch: {
        enabled: true,
        strategy: "same_focus",
        budgetMinutes: 95,
        plannedMinutes,
      },
    },
    tasks: [
      task({
        id: "stretch",
        title: "Stretch",
        category: "dictation_review",
        plannedMinutes,
        actualMinutes,
        planRole: "stretch",
        capacityKind: "stretch",
        statusRole: "optional",
        isCore: false,
      }),
    ],
  });
}

describe("calculateRecordRewardPoints", () => {
  it("awards full baseline points for green records", () => {
    expect(calculateRecordRewardPoints(record("2026-07-10", "green")).totalPoints).toBe(1);
  });

  it("awards partial baseline points for yellow records", () => {
    expect(calculateRecordRewardPoints(record("2026-07-10", "yellow")).totalPoints).toBe(0.5);
  });

  it("awards no baseline points for red records", () => {
    expect(calculateRecordRewardPoints(record("2026-07-10", "red")).totalPoints).toBe(0);
  });

  it("awards no points for pending records even with stretch minutes", () => {
    const result = calculateRecordRewardPoints(stretchRecord("pending", 40));

    expect(result.baselinePoints).toBe(0);
    expect(result.stretchPoints).toBe(0);
    expect(result.totalPoints).toBe(0);
  });

  it("adds proportional stretch bonus capped at 0.2", () => {
    expect(calculateRecordRewardPoints(stretchRecord("green", 20, 40)).stretchPoints).toBe(0.1);
    expect(calculateRecordRewardPoints(stretchRecord("green", 80, 40)).stretchPoints).toBe(0.2);
  });

  it("does not add stretch points without enabled stretch metadata", () => {
    const result = calculateRecordRewardPoints(record("2026-07-10", "green", {
      tasks: [task({ planRole: "stretch", capacityKind: "stretch", actualMinutes: 40 })],
    }));

    expect(result.stretchPoints).toBe(0);
    expect(result.totalPoints).toBe(1);
  });

  it("clamps negative stretch actual minutes to zero", () => {
    const result = calculateRecordRewardPoints(stretchRecord("green", -10, 40));

    expect(result.stretchCompletedMinutes).toBe(0);
    expect(result.stretchPoints).toBe(0);
  });
});

describe("calculateRewardSummary", () => {
  it("summarizes empty records safely", () => {
    expect(calculateRewardSummary([])).toEqual({
      totalPoints: 0,
      recent7Points: 0,
      completedDays: 0,
      averagePointsPerCompletedDay: 0,
    });
  });

  it("uses real date order for recent seven-day points", () => {
    const records = [
      record("2026-07-01", "green"),
      record("2026-07-02", "green"),
      record("2026-07-03", "green"),
      record("2026-07-04", "green"),
      record("2026-07-05", "green"),
      record("2026-07-06", "green"),
      record("2026-07-07", "green"),
      record("2026-07-08", "yellow"),
    ];

    const summary = calculateRewardSummary(records);

    expect(summary.totalPoints).toBe(7.5);
    expect(summary.recent7Points).toBe(6.5);
  });

  it("calculates goal progress and remaining points", () => {
    const summary = calculateRewardSummary(
      [record("2026-07-10", "green"), stretchRecord("green", 40, 40)],
      {
        id: "goal-1",
        title: "Hotpot dinner",
        targetPoints: 5,
      },
    );

    expect(summary.totalPoints).toBe(2.2);
    expect(summary.goalTitle).toBe("Hotpot dinner");
    expect(summary.goalTargetPoints).toBe(5);
    expect(summary.goalProgressRatio).toBe(0.44);
    expect(summary.pointsRemaining).toBe(2.8);
  });

  it("clamps completed goal progress to one", () => {
    const summary = calculateRewardSummary(
      [record("2026-07-10", "green"), record("2026-07-11", "green")],
      {
        id: "goal-1",
        title: "Small reward",
        targetPoints: 1,
      },
    );

    expect(summary.goalProgressRatio).toBe(1);
    expect(summary.pointsRemaining).toBe(0);
  });
});

describe("formatPoints", () => {
  it("formats points without noisy trailing decimals", () => {
    expect(formatPoints(1)).toBe("1");
    expect(formatPoints(1.1)).toBe("1.1");
    expect(formatPoints(0.5)).toBe("0.5");
  });
});

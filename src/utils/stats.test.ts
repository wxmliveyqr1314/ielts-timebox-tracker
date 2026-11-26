import { describe, expect, it } from "vitest";
import type { DailyRecord } from "../types";
import { getModuleMinutes, getRecentRecords, getSpeakingStats, getStretchStats } from "./stats";
import { buildDailyPlan } from "../planning/planEngine";

function record(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    date: "2026-07-05",
    weekday: "Sunday",
    exercised: false,
    startTime: "18:00",
    energyLevel: "normal",
    dayType: "listening_focus",
    workdayBonus: { passiveListeningMinutes: 0 },
    tasks: [],
    stoppedAfter2230: true,
    noCompensatoryStayingUp: true,
    tomorrowFirstStep: "",
    status: "green",
    createdAt: "2026-07-05T00:00:00.000Z",
    updatedAt: "2026-07-05T00:00:00.000Z",
    ...overrides,
  };
}

describe("module minute statistics", () => {
  it("counts speaking bonus, excess credit, and task actuals exactly once", () => {
    const plan = buildDailyPlan({
      dayContext: "workday",
      exercised: false,
      energyLevel: "normal",
      dayType: "speaking_focus",
      workdayBonus: { passiveListeningMinutes: 0, speakingMinutes: 75 },
    });
    const speaking = record({
      workdayBonus: plan.snapshot.input.workdayBonus,
      tasks: plan.tasks.map((task) => ({
        ...task,
        actualMinutes: task.definitionId === "speaking-conversation" ? 20 : 0,
      })),
      planSnapshot: { ...plan.snapshot, generatedAt: "2026-07-05T12:00:00Z" },
    });

    expect(getModuleMinutes([speaking]).totalSpeaking).toBe(95);
    expect(getModuleMinutes([speaking]).totalFormal).toBe(95);
    expect(getSpeakingStats([speaking])).toEqual({
      daysCompleted: 1,
      totalMinutes: 95,
      avgMinutes: 95,
    });
  });

  it("counts a speaking-bonus-only day and tolerates missing legacy bonus", () => {
    const records = [
      record({ workdayBonus: { passiveListeningMinutes: 0, speakingMinutes: 15 } }),
      record(),
    ];
    expect(getSpeakingStats(records)).toEqual({
      daysCompleted: 1,
      totalMinutes: 15,
      avgMinutes: 15,
    });
    expect(getModuleMinutes(records).totalFormal).toBe(15);
  });

  it("counts every completed-earlier category exactly once", () => {
    const result = getModuleMinutes([
      record({
        workdayBonus: {
          momoMinutes: 10,
          dictationMinutes: 20,
          readingMinutes: 30,
          passiveListeningMinutes: 40,
        },
      }),
    ]);

    expect(result).toEqual({
      totalFormal: 60,
      totalMomo: 10,
      totalDictation: 20,
      totalReading: 30,
      totalSpeaking: 0,
      totalPassive: 40,
    });
  });

  it("adds task actuals without adding snapshot credit a second time", () => {
    const result = getModuleMinutes([
      record({
        workdayBonus: {
          momoMinutes: 10,
          dictationMinutes: 20,
          readingMinutes: 0,
          passiveListeningMinutes: 40,
        },
        tasks: [
          {
            id: "dictation",
            title: "Dictation",
            category: "dictation_new",
            plannedMinutes: 30,
            actualMinutes: 15,
            completed: false,
            isCore: true,
            isEveningTask: true,
          },
          {
            id: "passive",
            title: "Passive",
            category: "passive_listening",
            plannedMinutes: 20,
            actualMinutes: 25,
            completed: true,
            isCore: false,
            isEveningTask: false,
          },
        ],
      }),
    ]);

    expect(result.totalFormal).toBe(45);
    expect(result.totalDictation).toBe(35);
    expect(result.totalPassive).toBe(65);
  });

  it("counts completed stretch minutes as study minutes", () => {
    const stretchRecord = record({
      planSnapshot: {
        engineVersion: 2,
        generatedAt: "2026-07-06T00:00:00.000Z",
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
          plannedMinutes: 20,
        },
      },
      tasks: [
        {
          id: "required-momo",
          title: "Required Momo",
          category: "momo",
          plannedMinutes: 30,
          actualMinutes: 30,
          completed: true,
          isCore: true,
          isEveningTask: true,
        },
        {
          id: "stretch-momo",
          title: "Stretch Momo",
          category: "momo",
          plannedMinutes: 20,
          actualMinutes: 20,
          completed: true,
          isCore: false,
          isEveningTask: true,
          planRole: "stretch",
          capacityKind: "stretch",
          statusRole: "optional",
        },
      ],
    });

    const result = getModuleMinutes([stretchRecord]);
    expect(result.totalFormal).toBe(50);
    expect(result.totalMomo).toBe(50);
  });
});

describe("recent calendar records", () => {
  it("uses today and six preceding dates even when records are sparse or unordered", () => {
    const records = [
      record({ date: "2026-11-19" }),
      record({ date: "2026-11-22" }),
      record({ date: "2026-11-27" }),
      record({ date: "2026-11-26" }),
      record({ date: "invalid" }),
      record({ date: "2026-11-20" }),
    ];
    const original = [...records];
    expect(getRecentRecords(records, 7, "2026-11-26").map((item) => item.date))
      .toEqual(["2026-11-26", "2026-11-22", "2026-11-20"]);
    expect(records).toEqual(original);
  });

  it("handles year boundaries and legacy unpadded dates", () => {
    expect(getRecentRecords([
      record({ date: "2025-12-26" }),
      record({ date: "2025-12-27" }),
      record({ date: "2026-1-2" }),
    ], 7, "2026-01-02").map((item) => item.date))
      .toEqual(["2026-1-2", "2025-12-27"]);
  });

  it("returns no recent activity after a long absence", () => {
    expect(getRecentRecords([record()], 7, "2026-11-26")).toEqual([]);
  });
});

describe("optional stretch statistics", () => {
  it("summarizes optional stretch usage", () => {
    const active = record({
      date: "2026-07-06",
      planSnapshot: {
        engineVersion: 2,
        generatedAt: "2026-07-06T00:00:00.000Z",
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
          plannedMinutes: 40,
        },
      },
      tasks: [
        {
          id: "stretch-momo",
          title: "Stretch Momo",
          category: "momo",
          plannedMinutes: 40,
          actualMinutes: 25,
          completed: false,
          isCore: false,
          isEveningTask: true,
          planRole: "stretch",
          capacityKind: "stretch",
          statusRole: "optional",
        },
      ],
    });

    expect(getStretchStats({ [active.date]: active })).toEqual({
      enabledDays: 1,
      partialDays: 1,
      completedMinutes: 25,
    });
  });
});

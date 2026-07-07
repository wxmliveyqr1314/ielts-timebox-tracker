import { describe, expect, it } from "vitest";
import type { DailyRecord } from "../types";
import { getModuleMinutes, getStretchStats } from "./stats";

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

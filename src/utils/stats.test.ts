import { describe, expect, it } from "vitest";
import type { DailyRecord } from "../types";
import { getModuleMinutes } from "./stats";

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
});

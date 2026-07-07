import { describe, expect, it } from "vitest";
import type {
  DailyPlanInput,
  DailyPlanSnapshot,
  DailyRecord,
  StretchStrategy,
  TaskCheckItem,
} from "../types";

describe("v2.1 planning contracts", () => {
  it("keeps new DailyRecord planning fields optional for legacy data", () => {
    const legacy = {
      date: "2026-07-05",
      weekday: "Sunday",
      exercised: false,
      startTime: "18:00",
      energyLevel: "normal",
      dayType: "listening_focus",
      workdayBonus: { passiveListeningMinutes: 0 },
      tasks: [],
      stoppedAfter2230: false,
      noCompensatoryStayingUp: false,
      tomorrowFirstStep: "",
      status: "pending",
      createdAt: "2026-07-05T00:00:00.000Z",
      updatedAt: "2026-07-05T00:00:00.000Z",
    } satisfies DailyRecord;

    expect(legacy.date).toBe("2026-07-05");
  });

  it("represents a versioned dynamic plan without browser state", () => {
    const input: DailyPlanInput = {
      exercised: false,
      energyLevel: "normal",
      dayType: "listening_focus",
      dayContext: "workday",
      workdayBonus: {
        passiveListeningMinutes: 75,
        momoMinutes: 20,
        dictationMinutes: 30,
        readingMinutes: 0,
      },
    };

    const snapshot: DailyPlanSnapshot = {
      engineVersion: 1,
      generatedAt: "2026-07-05T10:00:00.000Z",
      input,
      credits: [],
      summary: {
        standardCoreMinutes: 175,
        energyAdjustedCoreMinutes: 175,
        appliedCoreCreditMinutes: 50,
        extraCompletedMinutes: 15,
        capacityMinutes: 270,
        capacityTrimmedMinutes: 0,
        eveningCoreTargetMinutes: 125,
        passiveReferenceMinutes: 60,
        passiveReferenceRemainingMinutes: 0,
      },
      adjustmentCodes: [],
    };

    expect(snapshot.engineVersion).toBe(1);
  });

  it("allows stable optional task metadata", () => {
    const task = {
      id: "plan:dictation:new",
      title: "New dictation",
      category: "dictation_new",
      plannedMinutes: 50,
      actualMinutes: 0,
      completed: false,
      isCore: true,
      isEveningTask: true,
      definitionId: "dictation-new",
      entryId: "dictation:new",
      creditGroup: "dictation",
      capacityKind: "focused",
      statusRole: "required",
    } satisfies TaskCheckItem;

    expect(task.entryId).toBe("dictation:new");
  });

  it("allows optional stretch metadata without changing legacy snapshot shape", () => {
    const strategy: StretchStrategy = "same_focus";
    const task: TaskCheckItem = {
      id: "stretch:momo",
      title: "Momo vocabulary",
      category: "momo",
      plannedMinutes: 20,
      actualMinutes: 0,
      completed: false,
      isCore: false,
      isEveningTask: true,
      definitionId: "momo",
      entryId: "stretch:same_focus:momo",
      creditGroup: "momo",
      capacityKind: "stretch",
      statusRole: "optional",
      planRole: "stretch",
      stretchStrategy: strategy,
    };

    const snapshot: DailyPlanSnapshot = {
      engineVersion: 2,
      generatedAt: "2026-07-06T00:00:00.000Z",
      input: {
        exercised: false,
        energyLevel: "normal",
        dayType: "listening_focus",
        dayContext: "workday",
        workdayBonus: { passiveListeningMinutes: 0 },
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
        strategy,
        budgetMinutes: 95,
        plannedMinutes: 95,
      },
    };

    expect(task.planRole).toBe("stretch");
    expect(snapshot.stretch?.budgetMinutes).toBe(95);
  });
});

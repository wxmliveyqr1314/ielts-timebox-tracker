import { describe, expect, it } from "vitest";
import type { DailyPlanSnapshot, DailyRecord, TaskCheckItem } from "../types";
import { calculateColorStatus } from "./status";

function task(
  id: string,
  category: TaskCheckItem["category"],
  plannedMinutes: number,
  actualMinutes: number,
  overrides: Partial<TaskCheckItem> = {},
): TaskCheckItem {
  return {
    id,
    title: id,
    category,
    plannedMinutes,
    actualMinutes,
    completed: actualMinutes >= plannedMinutes,
    isCore: true,
    isEveningTask: true,
    ...overrides,
  };
}

function legacyRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    date: "2026-07-05",
    weekday: "Sunday",
    exercised: false,
    startTime: "18:00",
    energyLevel: "normal",
    dayType: "listening_focus",
    workdayBonus: { passiveListeningMinutes: 0, momoMinutes: 0 },
    tasks: [],
    stoppedAfter2230: true,
    noCompensatoryStayingUp: true,
    tomorrowFirstStep: "",
    status: "pending",
    createdAt: "2026-07-05T00:00:00.000Z",
    updatedAt: "2026-07-05T00:00:00.000Z",
    ...overrides,
  };
}

function dynamicSnapshot(
  overrides: Partial<DailyPlanSnapshot["summary"]> = {},
): DailyPlanSnapshot {
  return {
    engineVersion: 1,
    generatedAt: "2026-07-05T10:00:00.000Z",
    input: {
      exercised: false,
      energyLevel: "normal",
      dayType: "listening_focus",
      dayContext: "workday",
      workdayBonus: { passiveListeningMinutes: 0 },
    },
    credits: [],
    summary: {
      standardCoreMinutes: 100,
      energyAdjustedCoreMinutes: 100,
      appliedCoreCreditMinutes: 0,
      extraCompletedMinutes: 0,
      capacityMinutes: 270,
      capacityTrimmedMinutes: 0,
      eveningCoreTargetMinutes: 100,
      passiveReferenceMinutes: 60,
      passiveReferenceRemainingMinutes: 60,
      ...overrides,
    },
    adjustmentCodes: [],
  };
}

function controls(stopped = true, noCompensatory = true): TaskCheckItem[] {
  return [
    task("stop", "sleep_control", 0, 0, {
      definitionId: "sleep-stop-heavy",
      entryId: "control:sleep-stop-heavy",
      statusRole: "control",
      capacityKind: "control",
      completed: stopped,
    }),
    task("no-comp", "sleep_control", 0, 0, {
      definitionId: "sleep-no-compensation",
      entryId: "control:sleep-no-compensation",
      statusRole: "control",
      capacityKind: "control",
      completed: noCompensatory,
    }),
  ];
}

describe("legacy color status", () => {
  it("keeps empty legacy records pending", () => {
    expect(calculateColorStatus(legacyRecord())).toBe("pending");
  });

  it("keeps completed legacy core work green", () => {
    const tasks = [
      task("momo", "momo", 20, 20),
      task("main", "dictation_new", 30, 30),
      task("speak", "speaking_shadowing", 10, 10),
      task("wrap", "wrap_up", 5, 5),
    ];
    expect(calculateColorStatus(legacyRecord({ tasks }))).toBe("green");
  });

  it("keeps threshold legacy work yellow", () => {
    const tasks = [
      task("momo", "momo", 40, 20, { completed: true }),
      task("main", "dictation_new", 60, 30, { completed: false }),
      task("speak", "speaking_shadowing", 30, 10, { completed: false }),
      task("wrap", "wrap_up", 5, 0, { completed: false }),
    ];
    expect(calculateColorStatus(legacyRecord({ tasks }))).toBe("yellow");
  });

  it("keeps insufficient or compensatory legacy days red", () => {
    const tasks = [task("main", "dictation_new", 60, 10, { completed: false })];
    expect(calculateColorStatus(legacyRecord({ tasks }))).toBe("red");
    expect(
      calculateColorStatus(
        legacyRecord({ tasks, noCompensatoryStayingUp: false }),
      ),
    ).toBe("red");
  });
});

describe("dynamic color status", () => {
  function recordAt(actualMinutes: number): DailyRecord {
    return legacyRecord({
      planSnapshot: dynamicSnapshot(),
      tasks: [
        task("focus", "dictation_new", 100, actualMinutes, {
          entryId: "dictation:new",
          definitionId: "dictation-new",
          statusRole: "required",
          capacityKind: "focused",
        }),
        ...controls(),
      ],
    });
  }

  it.each([
    [0, "red"],
    [59, "red"],
    [60, "yellow"],
    [99, "yellow"],
    [100, "green"],
  ] as const)("maps %i percent progress to %s", (actual, expected) => {
    expect(calculateColorStatus(recordAt(actual))).toBe(expected);
  });

  it("requires both sleep controls for green", () => {
    const stoppedLate = recordAt(100);
    stoppedLate.tasks = [stoppedLate.tasks[0], ...controls(false, true)];
    expect(calculateColorStatus(stoppedLate)).toBe("yellow");

    const compensated = recordAt(100);
    compensated.tasks = [compensated.tasks[0], ...controls(true, false)];
    expect(calculateColorStatus(compensated)).toBe("red");
  });

  it("ignores passive, carried, and unrelated bonus minutes", () => {
    const record = recordAt(0);
    record.workdayBonus = {
      passiveListeningMinutes: 500,
      readingMinutes: 500,
    };
    record.tasks.splice(
      1,
      0,
      task("passive", "passive_listening", 60, 500, {
        isCore: false,
        statusRole: "ignored",
        capacityKind: "parallel",
      }),
      task("carried", "speaking_ai_conversation", 0, 500, {
        isCore: false,
        statusRole: "ignored",
        carriedForward: true,
      }),
    );

    expect(calculateColorStatus(record)).toBe("red");
  });

  it("counts applied matching credit toward the dynamic ratio", () => {
    const record = legacyRecord({
      planSnapshot: dynamicSnapshot({
        appliedCoreCreditMinutes: 80,
        eveningCoreTargetMinutes: 20,
      }),
      tasks: [
        task("wrap", "wrap_up", 20, 20, {
          entryId: "dictation:wrap",
          definitionId: "wrap-up",
          statusRole: "required",
          capacityKind: "anchor",
        }),
        ...controls(),
      ],
    });

    expect(calculateColorStatus(record)).toBe("green");
  });

  it("caps over-completion per task so it cannot hide another target", () => {
    const record = legacyRecord({
      planSnapshot: dynamicSnapshot(),
      tasks: [
        task("first", "dictation_review", 50, 100, {
          statusRole: "required",
          capacityKind: "focused",
        }),
        task("second", "dictation_new", 50, 0, {
          statusRole: "required",
          capacityKind: "focused",
        }),
        ...controls(),
      ],
    });

    expect(calculateColorStatus(record)).toBe("red");
  });
});

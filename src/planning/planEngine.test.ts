import { describe, expect, it } from "vitest";
import type { DailyPlanInput, TaskCheckItem } from "../types";
import { buildDailyPlan, getDefaultFocusedMinutes } from "./planEngine";

const baseInput = (overrides: Partial<DailyPlanInput> = {}): DailyPlanInput => ({
  exercised: false,
  energyLevel: "normal",
  dayType: "listening_focus",
  dayContext: "workday",
  workdayBonus: {
    passiveListeningMinutes: 0,
    momoMinutes: 0,
    dictationMinutes: 0,
    readingMinutes: 0,
  },
  ...overrides,
});

const focusedMinutes = (tasks: TaskCheckItem[]) =>
  tasks
    .filter(
      (task) =>
        task.capacityKind === "focused" || task.capacityKind === "anchor",
    )
    .reduce((sum, task) => sum + task.plannedMinutes, 0);

describe("dynamic daily plan engine", () => {
  it.each([
    ["workday", false, 270],
    ["workday", true, 210],
    ["rest_day", false, 330],
    ["rest_day", true, 270],
  ] as const)(
    "uses the default capacity for %s with workout=%s",
    (context, exercised, expected) => {
      expect(getDefaultFocusedMinutes(context, exercised)).toBe(expected);
    },
  );

  it("clamps manual capacity to 0..480", () => {
    expect(
      buildDailyPlan(baseInput({ availableFocusedMinutes: -10 })).snapshot.summary
        .capacityMinutes,
    ).toBe(0);
    expect(
      buildDailyPlan(baseInput({ availableFocusedMinutes: 999 })).snapshot.summary
        .capacityMinutes,
    ).toBe(480);
  });

  it("uses the schedule default for a non-finite manual capacity", () => {
    expect(
      buildDailyPlan(
        baseInput({ availableFocusedMinutes: Number.NaN }),
      ).snapshot.summary.capacityMinutes,
    ).toBe(270);
  });

  it("applies only matching core credit and reports extra completion", () => {
    const result = buildDailyPlan(
      baseInput({
        workdayBonus: {
          passiveListeningMinutes: 75,
          momoMinutes: 20,
          dictationMinutes: 30,
          readingMinutes: 10,
        },
      }),
    );

    expect(result.snapshot.summary).toEqual({
      standardCoreMinutes: 175,
      energyAdjustedCoreMinutes: 175,
      appliedCoreCreditMinutes: 50,
      extraCompletedMinutes: 25,
      capacityMinutes: 270,
      capacityTrimmedMinutes: 0,
      eveningCoreTargetMinutes: 125,
      passiveReferenceMinutes: 60,
      passiveReferenceRemainingMinutes: 0,
    });
    expect(
      result.tasks
        .filter((task) => task.creditGroup === "reading")
        .reduce((sum, task) => sum + task.plannedMinutes, 0),
    ).toBe(0);
    expect(result.snapshot.credits).toContainEqual({
      group: "reading",
      enteredMinutes: 10,
      appliedMinutes: 0,
      extraMinutes: 10,
    });
  });

  it("reduces matching entries down to zero without crossing groups", () => {
    const result = buildDailyPlan(
      baseInput({
        workdayBonus: {
          passiveListeningMinutes: 0,
          momoMinutes: 100,
          dictationMinutes: 200,
          readingMinutes: 50,
        },
      }),
    );

    expect(result.tasks.some((task) => task.creditGroup === "momo")).toBe(false);
    expect(result.tasks.some((task) => task.creditGroup === "dictation")).toBe(
      false,
    );
    expect(result.snapshot.summary.appliedCoreCreditMinutes).toBe(130);
    expect(result.snapshot.summary.extraCompletedMinutes).toBe(220);
    expect(result.snapshot.summary.eveningCoreTargetMinutes).toBe(45);
  });

  it("keeps passive listening outside focused capacity and status targets", () => {
    const result = buildDailyPlan(
      baseInput({
        workdayBonus: { passiveListeningMinutes: 20 },
      }),
    );
    const passive = result.tasks.find(
      (task) => task.creditGroup === "passive_listening",
    );

    expect(passive).toMatchObject({
      plannedMinutes: 40,
      isCore: false,
      capacityKind: "parallel",
      statusRole: "ignored",
    });
    expect(focusedMinutes(result.tasks)).toBe(175);
    expect(result.snapshot.summary.eveningCoreTargetMinutes).toBe(175);
  });

  it("omits passive task after the reference is met", () => {
    const result = buildDailyPlan(
      baseInput({ workdayBonus: { passiveListeningMinutes: 90 } }),
    );

    expect(
      result.tasks.some((task) => task.creditGroup === "passive_listening"),
    ).toBe(false);
    expect(result.snapshot.adjustmentCodes).toContain("passive_reference_met");
  });

  it("removes stretch work first when capacity is limited", () => {
    const result = buildDailyPlan(
      baseInput({
        dayType: "speaking_focus",
        energyLevel: "high",
        availableFocusedMinutes: 130,
      }),
    );

    expect(result.snapshot.summary.energyAdjustedCoreMinutes).toBe(150);
    expect(result.snapshot.summary.capacityTrimmedMinutes).toBe(20);
    expect(result.snapshot.summary.eveningCoreTargetMinutes).toBe(130);
    expect(result.tasks.some((task) => task.entryId === "speaking:stretch")).toBe(
      false,
    );
  });

  it("never exceeds a tiny focused capacity", () => {
    const result = buildDailyPlan(
      baseInput({ availableFocusedMinutes: 10 }),
    );

    expect(focusedMinutes(result.tasks)).toBe(10);
    expect(result.snapshot.summary.eveningCoreTargetMinutes).toBe(10);
    expect(result.snapshot.summary.capacityTrimmedMinutes).toBe(165);
  });

  it("keeps generated targets on registered five-minute increments", () => {
    const result = buildDailyPlan(
      baseInput({ availableFocusedMinutes: 168 }),
    );
    const focusedTasks = result.tasks.filter(
      (task) =>
        task.capacityKind === "focused" || task.capacityKind === "anchor",
    );

    expect(result.snapshot.summary.eveningCoreTargetMinutes).toBe(165);
    expect(focusedTasks.every((task) => task.plannedMinutes % 5 === 0)).toBe(
      true,
    );
  });

  it("does not increase Recovery for high energy", () => {
    const result = buildDailyPlan(
      baseInput({ dayType: "recovery", energyLevel: "high" }),
    );

    expect(result.snapshot.summary.standardCoreMinutes).toBe(60);
    expect(result.snapshot.summary.energyAdjustedCoreMinutes).toBe(60);
    expect(result.snapshot.adjustmentCodes).toContain("recovery_no_increase");
  });

  it("returns deterministic IDs without mutating input", () => {
    const input = baseInput({
      dayContext: "rest_day",
      exercised: true,
      workdayBonus: {
        passiveListeningMinutes: 10,
        momoMinutes: 5,
        dictationMinutes: 15,
        readingMinutes: 0,
      },
    });
    const before = structuredClone(input);
    const first = buildDailyPlan(input);
    const second = buildDailyPlan(input);

    expect(input).toEqual(before);
    expect(first.tasks.map((task) => task.id)).toEqual(
      second.tasks.map((task) => task.id),
    );
    expect(new Set(first.tasks.map((task) => task.id)).size).toBe(
      first.tasks.length,
    );
  });

  it("normalizes completed minutes to finite nonnegative integers", () => {
    const result = buildDailyPlan(
      baseInput({
        workdayBonus: {
          passiveListeningMinutes: Number.NaN,
          momoMinutes: -5,
          dictationMinutes: 20.9,
          readingMinutes: 999,
        },
      }),
    );

    expect(result.snapshot.credits).toEqual([
      {
        group: "passive_listening",
        enteredMinutes: 0,
        appliedMinutes: 0,
        extraMinutes: 0,
      },
      {
        group: "momo",
        enteredMinutes: 0,
        appliedMinutes: 0,
        extraMinutes: 0,
      },
      {
        group: "dictation",
        enteredMinutes: 20,
        appliedMinutes: 20,
        extraMinutes: 0,
      },
      {
        group: "reading",
        enteredMinutes: 720,
        appliedMinutes: 0,
        extraMinutes: 720,
      },
    ]);
  });

  it("adds same-focus stretch tasks from unused capacity when enabled", () => {
    const result = buildDailyPlan(
      baseInput({
        stretchEnabled: true,
        stretchStrategy: "same_focus",
      }),
    );

    const stretchTasks = result.tasks.filter(
      (task) => task.planRole === "stretch",
    );

    expect(result.snapshot.engineVersion).toBe(2);
    expect(result.snapshot.stretch).toMatchObject({
      enabled: true,
      strategy: "same_focus",
      budgetMinutes: 95,
      plannedMinutes: 95,
    });
    expect(
      stretchTasks.reduce((sum, task) => sum + task.plannedMinutes, 0),
    ).toBe(95);
    expect(stretchTasks.every((task) => task.statusRole === "optional")).toBe(
      true,
    );
    expect(stretchTasks.every((task) => task.capacityKind === "stretch")).toBe(
      true,
    );
  });

  it("keeps disabled stretch plans on the legacy snapshot shape", () => {
    const result = buildDailyPlan(baseInput());

    expect(result.snapshot.engineVersion).toBe(1);
    expect(result.snapshot.stretch).toBeUndefined();
    expect(result.snapshot.input.stretchEnabled).toBeUndefined();
    expect(result.snapshot.input.stretchStrategy).toBeUndefined();
  });

  it("uses selected mode target, not completed-earlier credit, for stretch budget", () => {
    const result = buildDailyPlan(
      baseInput({
        workdayBonus: {
          passiveListeningMinutes: 90,
          momoMinutes: 20,
          dictationMinutes: 30,
          readingMinutes: 720,
        },
        stretchEnabled: true,
        stretchStrategy: "balanced",
      }),
    );

    expect(result.snapshot.summary.eveningCoreTargetMinutes).toBe(125);
    expect(result.snapshot.stretch?.budgetMinutes).toBe(95);
    expect(result.snapshot.summary.extraCompletedMinutes).toBeGreaterThan(0);
  });

  it("does not add stretch when the selected mode already fills capacity", () => {
    const result = buildDailyPlan(
      baseInput({
        dayType: "reading_focus",
        energyLevel: "high",
        exercised: true,
        stretchEnabled: true,
        stretchStrategy: "same_focus",
      }),
    );

    expect(result.snapshot.summary.capacityMinutes).toBe(210);
    expect(result.snapshot.summary.energyAdjustedCoreMinutes).toBe(220);
    expect(result.snapshot.stretch).toMatchObject({
      enabled: true,
      strategy: "same_focus",
      budgetMinutes: 0,
      plannedMinutes: 0,
    });
    expect(result.tasks.some((task) => task.planRole === "stretch")).toBe(
      false,
    );
  });
});

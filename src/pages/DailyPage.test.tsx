// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DailyPage } from "./DailyPage";
import { buildDailyPlan } from "../planning/planEngine";
import type { DailyPlanInput, DailyRecord } from "../types";
import { getTodayStr } from "../utils/date";

afterEach(cleanup);

const baseInput: DailyPlanInput = {
  exercised: false,
  energyLevel: "normal",
  dayType: "listening_focus",
  dayContext: "workday",
  workdayBonus: {
    momoMinutes: 20,
    dictationMinutes: 30,
    readingMinutes: 10,
    passiveListeningMinutes: 75,
  },
};

function makeDynamicRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  const result = buildDailyPlan(baseInput);
  const now = "2026-07-05T10:00:00.000Z";
  return {
    date: getTodayStr(),
    weekday: "Sunday",
    exercised: false,
    startTime: "18:00",
    energyLevel: "normal",
    dayType: "listening_focus",
    dayContext: "workday",
    workdayBonus: baseInput.workdayBonus,
    tasks: result.tasks,
    stoppedAfter2230: false,
    noCompensatoryStayingUp: false,
    tomorrowFirstStep: "",
    status: "pending",
    createdAt: now,
    updatedAt: now,
    planSnapshot: { ...result.snapshot, generatedAt: now },
    ...overrides,
  };
}

function renderDaily(record?: DailyRecord) {
  const updateRecord = vi.fn();
  const appData = {
    data: { records: record ? { [record.date]: record } : {} },
    updateRecord,
    deleteRecord: vi.fn(),
  };
  render(<DailyPage appData={appData as any} />);
  return appData;
}

describe("DailyPage dynamic planning", () => {
  it("collects day context and optional focused minutes", () => {
    renderDaily();

    expect(screen.getByRole("button", { name: "Workday" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rest day" })).toBeTruthy();
    expect(screen.getByLabelText(/focused minutes available tonight/i)).toBeTruthy();
    expect(screen.getByText(/default: 270 minutes/i)).toBeTruthy();
  });

  it("labels completed time for workday and rest day", () => {
    renderDaily();
    expect(screen.getByText("Completed during workday")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Rest day" }));
    expect(screen.getByText("Completed earlier today")).toBeTruthy();
  });

  it("persists the selected inputs and generated snapshot together", () => {
    const appData = renderDaily();
    fireEvent.click(screen.getByRole("button", { name: "Rest day" }));
    fireEvent.change(screen.getByLabelText(/focused minutes available tonight/i), {
      target: { value: "90" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate Plan" }));

    const updater = appData.updateRecord.mock.calls[0][1];
    const created = updater(undefined) as DailyRecord;
    expect(created.dayContext).toBe("rest_day");
    expect(created.availableFocusedMinutes).toBe(90);
    expect(created.planSnapshot?.summary.capacityMinutes).toBe(90);
    expect(created.tasks.length).toBeGreaterThan(0);
  });

  it("persists speaking bonus minutes into the generated plan", () => {
    const appData = renderDaily();
    fireEvent.change(screen.getByLabelText(/speaking bonus minutes/i), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate Plan" }));

    const updater = appData.updateRecord.mock.calls[0][1];
    const created = updater(undefined) as DailyRecord;
    expect(created.workdayBonus.speakingMinutes).toBe(12);
    expect(created.planSnapshot?.input.workdayBonus.speakingMinutes).toBe(12);
  });

  it("shows capacity, mode target, credit, unused capacity, and tonight totals", () => {
    renderDaily(makeDynamicRecord());

    const summary = screen.getByRole("region", { name: "Plan summary" });
    expect(within(summary).getByText("Focused capacity")).toBeTruthy();
    expect(within(summary).getByText("Mode target")).toBeTruthy();
    expect(within(summary).getByText("Completed earlier")).toBeTruthy();
    expect(within(summary).getByText("Unused focused capacity")).toBeTruthy();
    expect(within(summary).getByText("Tonight focused")).toBeTruthy();
    expect(within(summary).getByText("125m")).toBeTruthy();
  });

  it("renders passive listening separately from focused time", () => {
    renderDaily(makeDynamicRecord());

    expect(screen.getByText("Parallel listening")).toBeTruthy();
    expect(screen.getByText(/60m reference/i)).toBeTruthy();
    expect(screen.getByText(/reference already met/i)).toBeTruthy();
  });

  it("keeps legacy tasks visible without v2.1 metadata", () => {
    const record = makeDynamicRecord({
      planSnapshot: undefined,
      dayContext: undefined,
      tasks: [{
        id: "legacy-task",
        title: "Legacy dictation task",
        category: "dictation_new",
        plannedMinutes: 30,
        actualMinutes: 0,
        completed: false,
        isCore: true,
        isEveningTask: true,
      }],
    });

    renderDaily(record);
    expect(screen.getByText("Legacy dictation task")).toBeTruthy();
  });

  it("keeps new sleep-control tasks synchronized with record fields", () => {
    const record = makeDynamicRecord();
    const appData = renderDaily(record);

    fireEvent.click(
      screen.getByRole("button", {
        name: /mark complete: no compensatory staying up/i,
      }),
    );

    const updater = appData.updateRecord.mock.calls[0][1];
    const updated = updater(record) as DailyRecord;
    expect(updated.noCompensatoryStayingUp).toBe(true);
  });

  it("renders only nonzero completed-earlier entries", () => {
    renderDaily(makeDynamicRecord());

    const completed = screen.getByRole("region", { name: "Completed earlier" });
    expect(within(completed).getByText("Momo vocabulary")).toBeTruthy();
    expect(within(completed).getByText("Dictation")).toBeTruthy();
    expect(within(completed).getByText("IELTS reading")).toBeTruthy();
    expect(within(completed).getByText("Passive listening")).toBeTruthy();
  });

  it("shows a regeneration preview before applying changes", () => {
    const record = makeDynamicRecord({
      tasks: makeDynamicRecord().tasks.map((task, index) =>
        index === 0 ? { ...task, actualMinutes: 15, completed: true } : task,
      ),
    });
    const appData = renderDaily(record);

    fireEvent.click(screen.getByRole("button", { name: /edit plan inputs/i }));
    fireEvent.click(screen.getByRole("button", { name: "Low" }));
    fireEvent.click(screen.getByRole("button", { name: /preview regenerated plan/i }));

    expect(screen.getByRole("dialog", { name: /review plan changes/i })).toBeTruthy();
    expect(screen.getByText(/actual minutes, completion, and notes will be preserved/i)).toBeTruthy();
    expect(appData.updateRecord).not.toHaveBeenCalled();
  });

  it("preserves actual minutes and notes after regeneration", () => {
    const original = makeDynamicRecord();
    const first = {
      ...original.tasks[0],
      actualMinutes: 15,
      completed: true,
      notes: "real work",
    };
    const record = { ...original, tasks: [first, ...original.tasks.slice(1)] };
    const appData = renderDaily(record);

    fireEvent.click(screen.getByRole("button", { name: /edit plan inputs/i }));
    fireEvent.click(screen.getByRole("button", { name: "Low" }));
    fireEvent.click(screen.getByRole("button", { name: /preview regenerated plan/i }));
    fireEvent.click(screen.getByRole("button", { name: /apply regenerated plan/i }));

    expect(appData.updateRecord).toHaveBeenCalledTimes(1);
    const updater = appData.updateRecord.mock.calls[0][1];
    const updated = updater(record) as DailyRecord;
    expect(updated.tasks).toContainEqual(
      expect.objectContaining({
        entryId: first.entryId,
        actualMinutes: 15,
        completed: true,
        notes: "real work",
      }),
    );
  });

  it("can safely enable same-focus stretch after generating a baseline plan", () => {
    const record = makeDynamicRecord();
    const appData = renderDaily(record);

    expect(screen.getByText("Optional stretch")).toBeTruthy();
    expect(screen.getByText("Unused focused capacity")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("switch", { name: /add optional stretch/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /same focus/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /preview stretch changes/i }),
    );

    expect(
      screen.getByRole("dialog", { name: /review plan changes/i }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /apply regenerated plan/i }),
    );

    const updater = appData.updateRecord.mock.calls[0][1];
    const updated = updater(record) as DailyRecord;
    expect(updated.planSnapshot?.stretch).toMatchObject({
      enabled: true,
      strategy: "same_focus",
      budgetMinutes: 95,
      plannedMinutes: 95,
    });
    expect(updated.tasks.some((task) => task.planRole === "stretch")).toBe(
      true,
    );

    cleanup();
    renderDaily(updated);
    expect(
      screen.getByRole("region", { name: /optional stretch tasks/i }),
    ).toBeTruthy();
    expect(screen.getByText(/0 penalty if skipped/i)).toBeTruthy();
  });
});

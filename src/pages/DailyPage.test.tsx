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
  it("shows completed-earlier speaking in Chinese without rewriting the record", () => {
    const record = makeDynamicRecord({ workdayBonus: { ...baseInput.workdayBonus, speakingMinutes: 12 } });
    const before = JSON.stringify(record);
    const appData = renderDaily(record);
    const completed = screen.getByRole("region", { name: "提前完成的学习" });
    expect(within(completed).getByText("口语")).toBeTruthy();
    expect(within(completed).getByText("12分钟")).toBeTruthy();
    expect(JSON.stringify(record)).toBe(before);
    expect(appData.updateRecord).not.toHaveBeenCalled();
  });

  it("collects day context and optional focused minutes", () => {
    renderDaily();

    expect(screen.getByRole("button", { name: "工作日" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "休息日" })).toBeTruthy();
    expect(screen.getByLabelText(/今晚可用的专注学习时间/i)).toBeTruthy();
    expect(screen.getByText(/默认值：270分钟/i)).toBeTruthy();
  });

  it("labels completed time for workday and rest day", () => {
    renderDaily();
    expect(screen.getByText("工作期间已完成")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "休息日" }));
    expect(screen.getByText("今天已提前完成")).toBeTruthy();
  });

  it("persists the selected inputs and generated snapshot together", () => {
    const appData = renderDaily();
    fireEvent.click(screen.getByRole("button", { name: "休息日" }));
    fireEvent.change(screen.getByLabelText(/今晚可用的专注学习时间/i), {
      target: { value: "90" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成计划" }));

    const updater = appData.updateRecord.mock.calls[0][1];
    const created = updater(undefined) as DailyRecord;
    expect(created.dayContext).toBe("rest_day");
    expect(created.availableFocusedMinutes).toBe(90);
    expect(created.planSnapshot?.summary.capacityMinutes).toBe(90);
    expect(created.tasks.length).toBeGreaterThan(0);
  });

  it("persists speaking bonus minutes into the generated plan", () => {
    const appData = renderDaily();
    fireEvent.change(screen.getByLabelText(/已完成的口语时长/i), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成计划" }));

    const updater = appData.updateRecord.mock.calls[0][1];
    const created = updater(undefined) as DailyRecord;
    expect(created.workdayBonus.speakingMinutes).toBe(12);
    expect(created.planSnapshot?.input.workdayBonus.speakingMinutes).toBe(12);
  });

  it("shows capacity, mode target, credit, unused capacity, and tonight totals", () => {
    renderDaily(makeDynamicRecord());

    const summary = screen.getByRole("region", { name: "计划概览" });
    expect(within(summary).getByText("可用专注时间")).toBeTruthy();
    expect(within(summary).getByText("当前模式目标")).toBeTruthy();
    expect(within(summary).getByText("提前完成的学习")).toBeTruthy();
    expect(within(summary).getByText("剩余可用时间")).toBeTruthy();
    expect(within(summary).getByText("今晚必做")).toBeTruthy();
    expect(within(summary).getByText("125分钟")).toBeTruthy();
  });

  it("renders passive listening separately from focused time", () => {
    renderDaily(makeDynamicRecord());

    expect(screen.getByText("泛听参考")).toBeTruthy();
    expect(screen.getByText(/参考时长 60分钟/i)).toBeTruthy();
    expect(screen.getByText(/已达到参考时长/i)).toBeTruthy();
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
    expect(screen.queryByText(/完成标准：/i)).toBeNull();
  });

  it("shows concise guidance for registered task definitions", () => {
    const record = makeDynamicRecord({
      tasks: [{
        id: "momo-task",
        title: "Momo 词汇复习",
        category: "momo",
        plannedMinutes: 20,
        actualMinutes: 0,
        completed: false,
        isCore: true,
        isEveningTask: true,
        definitionId: "momo",
      }],
    });

    renderDaily(record);
    expect(
      screen.getByText(
        "完成今天的 Momo 词汇复习，优先保证准确率。",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "完成标准：完成计划时长，或完成今天安排的 Momo 复习单元。",
      ),
    ).toBeTruthy();
  });

  it("keeps new sleep-control tasks synchronized with record fields", () => {
    const record = makeDynamicRecord();
    const appData = renderDaily(record);

    fireEvent.click(
      screen.getByRole("button", {
        name: /标记为完成：不补偿性熬夜/i,
      }),
    );

    const updater = appData.updateRecord.mock.calls[0][1];
    const updated = updater(record) as DailyRecord;
    expect(updated.noCompensatoryStayingUp).toBe(true);
  });

  it("renders only nonzero completed-earlier entries", () => {
    renderDaily(makeDynamicRecord());

    const completed = screen.getByRole("region", { name: "提前完成的学习" });
    expect(within(completed).getByText("Momo 词汇复习")).toBeTruthy();
    expect(within(completed).getByText("听写")).toBeTruthy();
    expect(within(completed).getByText("雅思阅读")).toBeTruthy();
    expect(within(completed).getByText("泛听")).toBeTruthy();
  });

  it("shows a regeneration preview before applying changes", () => {
    const record = makeDynamicRecord({
      tasks: makeDynamicRecord().tasks.map((task, index) =>
        index === 0 ? { ...task, actualMinutes: 15, completed: true } : task,
      ),
    });
    const appData = renderDaily(record);

    fireEvent.click(screen.getByRole("button", { name: /调整计划设置/i }));
    fireEvent.click(screen.getByRole("button", { name: "偏低" }));
    fireEvent.click(screen.getByRole("button", { name: /预览新计划/i }));

    expect(screen.getByRole("dialog", { name: /确认计划变更/i })).toBeTruthy();
    expect(screen.getByText(/已记录的时长、完成情况和备注都会保留/i)).toBeTruthy();
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

    fireEvent.click(screen.getByRole("button", { name: /调整计划设置/i }));
    fireEvent.click(screen.getByRole("button", { name: "偏低" }));
    fireEvent.click(screen.getByRole("button", { name: /预览新计划/i }));
    fireEvent.click(screen.getByRole("button", { name: /应用新计划/i }));

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

    expect(screen.getByText("可选加练")).toBeTruthy();
    expect(screen.getByText("剩余可用时间")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("switch", { name: /添加可选加练/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /同方向加练/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /预览加练变更/i }),
    );

    expect(
      screen.getByRole("dialog", { name: /确认计划变更/i }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /应用新计划/i }),
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
      screen.getByRole("region", { name: /可选加练任务/i }),
    ).toBeTruthy();
    expect(screen.getByText(/跳过不扣分/i)).toBeTruthy();
  });
});

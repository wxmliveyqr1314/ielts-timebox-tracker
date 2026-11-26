// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HistoryPage } from "./HistoryPage";
import { DailyRecord, DayStatus } from "../types";
import { buildDailyPlan } from "../planning/planEngine";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 5, 27, 12));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function makeRecord(date: string, status: DayStatus): DailyRecord {
  return {
    date,
    weekday: "Friday",
    startTime: "19:00",
    dayType: "listening_focus",
    energyLevel: "normal",
    exercised: false,
    status,
    stoppedAfter2230: true,
    noCompensatoryStayingUp: true,
    tomorrowFirstStep: "Open the listening notes and review one sentence",
    notes: "",
    bedtime: "22:20",
    workdayBonus: {
      momoMinutes: 0,
      passiveListeningMinutes: 0,
      dictationMinutes: 0,
      readingMinutes: 0,
    },
    tasks: [{
      id: `${date}-task`,
      title: "A deliberately long task title that must not hide the minutes input on a narrow screen",
      category: "dictation_new",
      plannedMinutes: 30,
      actualMinutes: 20,
      completed: true,
      isCore: true,
      isEveningTask: true,
      notes: "",
    }],
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
  };
}

function renderHistory(records: Record<string, DailyRecord>) {
  const appData = {
    data: { records },
    updateRecord: vi.fn(),
    deleteRecord: vi.fn(),
  };
  render(<HistoryPage appData={appData as any} />);
  return appData;
}

function makeDynamicRecord(date: string): DailyRecord {
  const result = buildDailyPlan({
    dayContext: "workday",
    exercised: false,
    energyLevel: "normal",
    dayType: "listening_focus",
    availableFocusedMinutes: 90,
    workdayBonus: {
      momoMinutes: 20,
      dictationMinutes: 30,
      readingMinutes: 10,
      passiveListeningMinutes: 75,
    },
  });
  const now = `${date}T12:00:00.000Z`;
  return {
    ...makeRecord(date, "yellow"),
    dayContext: "workday",
    availableFocusedMinutes: 90,
    workdayBonus: result.snapshot.input.workdayBonus,
    tasks: result.tasks,
    planSnapshot: { ...result.snapshot, generatedAt: now },
  };
}

describe("HistoryPage", () => {
  it("keeps old history rows while excluding them from the seven-day summary", () => {
    renderHistory({
      recent: makeRecord("2026-06-27", "green"),
      old: makeRecord("2026-06-01", "yellow"),
      future: makeRecord("2026-06-28", "red"),
    });
    const summary = screen.getByRole("region", { name: "最近学习记录概览" });
    expect(summary.textContent).toContain("1天数1达标0部分完成0需调整0待开始");
    expect(screen.getByRole("button", { name: /展开2026年6月1日/i })).toBeTruthy();
  });

  it("reports speaking bonus and all formal task minutes once on speaking days", () => {
    const record = makeRecord("2026-06-27", "green");
    record.dayType = "speaking_focus";
    record.workdayBonus.speakingMinutes = 15;
    record.tasks[0].category = "speaking_shadowing";
    renderHistory({ [record.date]: record });
    expect(screen.getByText("正式学习：35分钟")).toBeTruthy();
    expect(screen.getByText("口语：35分钟")).toBeTruthy();
  });

  it("renders all status counts including pending", () => {
    renderHistory({
      a: makeRecord("2026-06-27", "green"),
      b: makeRecord("2026-06-26", "yellow"),
      c: makeRecord("2026-06-25", "red"),
      d: makeRecord("2026-06-24", "pending"),
    });
    expect(screen.getAllByText("达标").length).toBeGreaterThan(0);
    expect(screen.getAllByText("部分完成").length).toBeGreaterThan(0);
    expect(screen.getAllByText("需调整").length).toBeGreaterThan(0);
    expect(screen.getAllByText("待开始").length).toBeGreaterThan(0);
  });

  it("renders a calm empty state", () => {
    renderHistory({});
    expect(screen.getByText(/完成学习后/i)).toBeTruthy();
  });

  it("uses a semantic expand button and preserves editing controls", () => {
    renderHistory({ a: makeRecord("2026-06-27", "green") });
    fireEvent.click(screen.getByRole("button", { name: /展开2026年6月27日/i }));
    expect(screen.getByDisplayValue("20")).toBeTruthy();
    expect(screen.getByPlaceholderText(/任务备注/i)).toBeTruthy();
  });

  it("shows a readable focus mode label", () => {
    renderHistory({ a: makeRecord("2026-06-27", "green") });
    expect(screen.getByText("听写")).toBeTruthy();
    expect(screen.queryByText("listening_focus")).toBeNull();
  });

  it("shows the persisted dynamic plan summary when expanded", () => {
    renderHistory({ a: makeDynamicRecord("2026-06-27") });
    fireEvent.click(screen.getByRole("button", { name: /展开2026年6月27日/i }));

    const summary = screen.getByRole("region", { name: /历史计划概览/i });
    const planSummary = within(summary).getByRole("region", {
      name: "计划概览",
    });
    expect(within(summary).getByText("工作日")).toBeTruthy();
    expect(within(planSummary).getByText("可用专注时间")).toBeTruthy();
    expect(within(planSummary).getByText("当前模式目标")).toBeTruthy();
    expect(within(planSummary).getByText("今晚必做")).toBeTruthy();
    expect(within(planSummary).getAllByText("90分钟")).toHaveLength(2);
    expect(within(planSummary).getByText("提前完成的学习")).toBeTruthy();
    expect(within(planSummary).getByText("剩余可用时间")).toBeTruthy();
    expect(within(summary).getByText("135分钟")).toBeTruthy();
    expect(within(planSummary).getByText("泛听参考")).toBeTruthy();
    expect(within(planSummary).getByText(/已达到参考时长/i)).toBeTruthy();
  });

  it("keeps legacy details available without a plan summary", () => {
    renderHistory({ a: makeRecord("2026-06-27", "green") });
    fireEvent.click(screen.getByRole("button", { name: /展开2026年6月27日/i }));

    expect(screen.getByText("学习任务")).toBeTruthy();
    expect(screen.queryByRole("region", { name: /历史计划概览/i })).toBeNull();
  });

  it("warns when a historical plan input changes without replacing tasks", () => {
    const record = makeDynamicRecord("2026-06-27");
    const appData = renderHistory({ a: record });
    fireEvent.click(screen.getByRole("button", { name: /展开2026年6月27日/i }));
    fireEvent.change(screen.getByLabelText(/当天安排/i), {
      target: { value: "rest_day" },
    });

    expect(screen.getByText(/计划设置已变更/i)).toBeTruthy();
    expect(screen.getByText(/当前任务尚未重新生成/)).toBeTruthy();
    const updater = appData.updateRecord.mock.calls[0][1];
    const updated = updater(record) as DailyRecord;
    expect(updated.dayContext).toBe("rest_day");
    expect(updated.tasks).toEqual(record.tasks);
  });

  it("shows stretch summary without changing historical status", () => {
    const result = buildDailyPlan({
      dayContext: "workday",
      exercised: false,
      energyLevel: "normal",
      dayType: "listening_focus",
      workdayBonus: { passiveListeningMinutes: 0 },
      stretchEnabled: true,
      stretchStrategy: "balanced",
    });
    const date = "2026-06-27";
    const record: DailyRecord = {
      ...makeRecord(date, "green"),
      dayContext: "workday",
      workdayBonus: result.snapshot.input.workdayBonus,
      tasks: result.tasks,
      planSnapshot: {
        ...result.snapshot,
        generatedAt: `${date}T12:00:00.000Z`,
      },
    };

    renderHistory({ [date]: record });
    fireEvent.click(
      screen.getByRole("button", { name: /展开2026年6月27日/i }),
    );

    expect(screen.getByText("可选加练")).toBeTruthy();
    expect(screen.getByText(/加练不影响当天状态/i)).toBeTruthy();
    expect(screen.getByText("均衡加练")).toBeTruthy();
    expect(screen.getAllByText(/达标/i).length).toBeGreaterThan(0);
  });
});

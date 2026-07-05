// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HistoryPage } from "./HistoryPage";
import { DailyRecord, DayStatus } from "../types";
import { buildDailyPlan } from "../planning/planEngine";

afterEach(cleanup);

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
  it("renders all status counts including pending", () => {
    renderHistory({
      a: makeRecord("2026-06-27", "green"),
      b: makeRecord("2026-06-26", "yellow"),
      c: makeRecord("2026-06-25", "red"),
      d: makeRecord("2026-06-24", "pending"),
    });
    expect(screen.getAllByText("Green").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Yellow").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Red").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
  });

  it("renders a calm empty state", () => {
    renderHistory({});
    expect(screen.getByText(/completed days will appear here/i)).toBeTruthy();
  });

  it("uses a semantic expand button and preserves editing controls", () => {
    renderHistory({ a: makeRecord("2026-06-27", "green") });
    fireEvent.click(screen.getByRole("button", { name: /expand jun 27, 2026/i }));
    expect(screen.getByDisplayValue("20")).toBeTruthy();
    expect(screen.getByPlaceholderText(/task notes/i)).toBeTruthy();
  });

  it("shows a readable focus mode label", () => {
    renderHistory({ a: makeRecord("2026-06-27", "green") });
    expect(screen.getByText("Dictation")).toBeTruthy();
    expect(screen.queryByText("listening_focus")).toBeNull();
  });

  it("shows the persisted dynamic plan summary when expanded", () => {
    renderHistory({ a: makeDynamicRecord("2026-06-27") });
    fireEvent.click(screen.getByRole("button", { name: /expand jun 27, 2026/i }));

    const summary = screen.getByRole("region", { name: /historical plan summary/i });
    expect(within(summary).getByText("Workday")).toBeTruthy();
    expect(within(summary).getByText("Tonight focused")).toBeTruthy();
    expect(within(summary).getByText("90m")).toBeTruthy();
    expect(within(summary).getByText("Completed earlier")).toBeTruthy();
    expect(within(summary).getByText("135m")).toBeTruthy();
    expect(within(summary).getByText("Capacity trim")).toBeTruthy();
    expect(within(summary).getByText("Parallel listening")).toBeTruthy();
    expect(within(summary).getByText(/reference already met/i)).toBeTruthy();
  });

  it("keeps legacy details available without a plan summary", () => {
    renderHistory({ a: makeRecord("2026-06-27", "green") });
    fireEvent.click(screen.getByRole("button", { name: /expand jun 27, 2026/i }));

    expect(screen.getByText("Tasks")).toBeTruthy();
    expect(screen.queryByRole("region", { name: /historical plan summary/i })).toBeNull();
  });

  it("warns when a historical plan input changes without replacing tasks", () => {
    const record = makeDynamicRecord("2026-06-27");
    const appData = renderHistory({ a: record });
    fireEvent.click(screen.getByRole("button", { name: /expand jun 27, 2026/i }));
    fireEvent.change(screen.getByLabelText(/historical day context/i), {
      target: { value: "rest_day" },
    });

    expect(screen.getByText(/plan inputs changed/i)).toBeTruthy();
    expect(screen.getByText(/existing tasks were not regenerated/i)).toBeTruthy();
    const updater = appData.updateRecord.mock.calls[0][1];
    const updated = updater(record) as DailyRecord;
    expect(updated.dayContext).toBe("rest_day");
    expect(updated.tasks).toEqual(record.tasks);
  });
});

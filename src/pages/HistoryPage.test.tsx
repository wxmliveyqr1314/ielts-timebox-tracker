// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HistoryPage } from "./HistoryPage";
import { DailyRecord, DayStatus } from "../types";

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
});

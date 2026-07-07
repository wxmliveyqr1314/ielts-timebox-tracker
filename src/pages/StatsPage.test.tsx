// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StatsPage } from "./StatsPage";
import { DailyRecord } from "../types";

afterEach(cleanup);

function makeStatsRecord(
  date: string,
  status: DailyRecord["status"],
): DailyRecord {
  const task = (
    id: string,
    category: DailyRecord["tasks"][number]["category"],
    actualMinutes: number,
  ): DailyRecord["tasks"][number] => ({
    id: `${date}-${id}`,
    title: id,
    category,
    plannedMinutes: actualMinutes,
    actualMinutes,
    completed: actualMinutes > 0,
    isCore: category !== "passive_listening",
    isEveningTask: category !== "passive_listening",
    notes: "",
  });

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
    tomorrowFirstStep: "Review one sentence",
    notes: "",
    bedtime: "22:20",
    workdayBonus: {
      momoMinutes: 0,
      passiveListeningMinutes: 0,
      dictationMinutes: 0,
      readingMinutes: 0,
    },
    tasks: [
      task("Momo", "momo", 20),
      task("Dictation", "dictation_new", 30),
      task("Reading", "reading_scan", 20),
      task("Speaking", "speaking_shadowing", 10),
      task("Passive listening", "passive_listening", 15),
    ],
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
  };
}

function makeStatsRecords(): Record<string, DailyRecord> {
  return {
    "2026-06-27": makeStatsRecord("2026-06-27", "green"),
    "2026-06-26": makeStatsRecord("2026-06-26", "yellow"),
    "2026-06-25": makeStatsRecord("2026-06-25", "red"),
    "2026-06-24": makeStatsRecord("2026-06-24", "pending"),
  };
}

describe("StatsPage", () => {
  it("renders the approved heading and core sections", () => {
    const records: Record<string, DailyRecord> = makeStatsRecords();
    render(<StatsPage appData={{ data: { records } }} />);
    expect(screen.getByRole("heading", { name: "Stats" })).toBeTruthy();
    expect(screen.getByText("Last 7 days")).toBeTruthy();
    expect(screen.getByText("Current streak")).toBeTruthy();
    expect(screen.getByText("Status distribution")).toBeTruthy();
    expect(screen.getByText("Time by module")).toBeTruthy();
    expect(screen.getByText("Sleep control")).toBeTruthy();
  });

  it("renders status distribution segment bar with explicit counts", () => {
    render(<StatsPage appData={{ data: { records: makeStatsRecords() } }} />);
    expect(screen.getByRole("region", { name: /status distribution/i })).toBeTruthy();
    for (const label of ["Green", "Yellow", "Red", "Pending"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("uses formatMinutes for formal study time", () => {
    render(<StatsPage appData={{ data: { records: makeStatsRecords() } }} />);
    // In makeStatsRecords, 4 days * 80 min = 320 min total formal study time.
    // formatMinutes(320) yields "5h 20m"
    expect(screen.getByText(/5h 20m/)).toBeTruthy();
  });

  it("renders a neutral empty state without invalid percentages", () => {
    const { container } = render(<StatsPage appData={{ data: { records: {} } }} />);
    expect(screen.getByText(/complete a day to see your trends/i)).toBeTruthy();
    expect(screen.getByText("Last 7 days")).toBeTruthy();
    expect(container.innerHTML).not.toContain("NaN");
    expect(container.innerHTML).not.toContain("Infinity");
  });

  it("renders the approved supporting message", () => {
    render(<StatsPage appData={{ data: { records: {} } }} />);
    expect(screen.getByText(/steady progress, not daily perfection/i)).toBeTruthy();
  });

  it("renders optional stretch stats separately from core stats", () => {
    const stretchRecord = makeStatsRecord("2026-06-27", "green");
    stretchRecord.planSnapshot = {
      engineVersion: 2,
      generatedAt: "2026-06-27T00:00:00.000Z",
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
    };
    stretchRecord.tasks.push({
      id: "stretch-momo",
      title: "Stretch Momo",
      category: "momo",
      plannedMinutes: 40,
      actualMinutes: 25,
      completed: false,
      isCore: false,
      isEveningTask: true,
      notes: "",
      planRole: "stretch",
      capacityKind: "stretch",
      statusRole: "optional",
    });

    render(<StatsPage appData={{ data: { records: { [stretchRecord.date]: stretchRecord } } }} />);

    const stretchRegion = screen.getByRole("region", { name: /optional stretch/i });
    expect(stretchRegion).toBeTruthy();
    expect(stretchRegion.textContent).toContain("No penalty");
    expect(stretchRegion.textContent).toContain("25");
    expect(stretchRegion.textContent).toContain("minutes");
    expect(stretchRegion.textContent).toContain("1");
    expect(stretchRegion.textContent).toContain("enabled days");
    expect(stretchRegion.textContent).toContain("active days");
  });
});

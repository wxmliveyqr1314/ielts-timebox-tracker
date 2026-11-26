// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StatsPage } from "./StatsPage";
import { DailyRecord } from "../types";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 5, 27, 12));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

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
      task("听写", "dictation_new", 30),
      task("阅读", "reading_scan", 20),
      task("口语", "speaking_shadowing", 10),
      task("泛听", "passive_listening", 15),
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
  it("shows no recent study after a long absence but retains lifetime reward points", () => {
    vi.setSystemTime(new Date(2026, 10, 26, 12));
    render(<StatsPage appData={{ data: { records: makeStatsRecords() } }} />);
    expect(within(screen.getByRole("group", { name: "学习时长" })).getByText("0分钟")).toBeTruthy();
    expect(screen.queryByText("5小时20分钟")).toBeNull();
    expect(screen.getByRole("region", { name: /学习积分/i }).textContent).toContain("1.5");
    expect(screen.queryByText("暂无统计数据")).toBeNull();
    const streak = screen.getByRole("group", { name: "当前连续学习" });
    expect(within(streak).getByText("0")).toBeTruthy();
    expect(streak.textContent).toContain("历史最佳：2天");
  });

  it("includes completed-earlier speaking in the time and speaking activity cards", () => {
    const record = makeStatsRecord("2026-06-27", "green");
    record.tasks = [];
    record.workdayBonus.speakingMinutes = 25;
    render(<StatsPage appData={{ data: { records: { [record.date]: record } } }} />);
    expect(within(screen.getByRole("group", { name: "学习时长" })).getByText("25分钟")).toBeTruthy();
    expect(screen.getByText("平均每天 25分钟")).toBeTruthy();
  });

  it("renders the approved heading and core sections", () => {
    const records: Record<string, DailyRecord> = makeStatsRecords();
    render(<StatsPage appData={{ data: { records } }} />);
    expect(screen.getByRole("heading", { name: "统计" })).toBeTruthy();
    expect(screen.getAllByText("最近 7 天").length).toBeGreaterThan(0);
    expect(screen.getByText("当前连续学习")).toBeTruthy();
    expect(screen.getByText("完成情况")).toBeTruthy();
    expect(screen.getByText("各项学习时长")).toBeTruthy();
    expect(screen.getByText("睡眠保护")).toBeTruthy();
  });

  it("renders status distribution segment bar with explicit counts", () => {
    render(<StatsPage appData={{ data: { records: makeStatsRecords() } }} />);
    expect(screen.getByRole("region", { name: /完成情况/i })).toBeTruthy();
    for (const label of ["达标", "部分完成", "需调整", "待开始"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("uses formatMinutes for formal study time", () => {
    render(<StatsPage appData={{ data: { records: makeStatsRecords() } }} />);
    // In makeStatsRecords, 4 days * 80 min = 320 min total formal study time.
    // formatMinutes(320) yields "5h 20m"
    expect(screen.getByText(/5小时20分钟/)).toBeTruthy();
  });

  it("renders a neutral empty state without invalid percentages", () => {
    const { container } = render(<StatsPage appData={{ data: { records: {} } }} />);
    expect(screen.getByText(/完成一天的学习后/i)).toBeTruthy();
    expect(screen.getByText("最近 7 天")).toBeTruthy();
    expect(container.innerHTML).not.toContain("NaN");
    expect(container.innerHTML).not.toContain("Infinity");
  });

  it("renders the approved supporting message", () => {
    render(<StatsPage appData={{ data: { records: {} } }} />);
    expect(screen.getByText(/保持稳定进步/i)).toBeTruthy();
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

    const stretchRegion = screen.getByRole("region", { name: /可选加练/i });
    expect(stretchRegion).toBeTruthy();
    expect(stretchRegion.textContent).toContain("跳过不扣分");
    expect(stretchRegion.textContent).toContain("25");
    expect(stretchRegion.textContent).toContain("分钟");
    expect(stretchRegion.textContent).toContain("1");
    expect(stretchRegion.textContent).toContain("开启天数");
    expect(stretchRegion.textContent).toContain("练习天数");
  });

  it("renders reward points and active goal progress", () => {
    render(
      <StatsPage
        appData={{
          data: {
            records: makeStatsRecords(),
            rewards: {
              schemaVersion: 1,
              activeGoal: {
                id: "goal-1",
                title: "吃一顿火锅",
                targetPoints: 5,
                note: "After steady study",
                createdAt: "2026-07-10T00:00:00.000Z",
              },
            },
          },
        }}
      />,
    );

    const rewardRegion = screen.getByRole("region", { name: /学习积分/i });

    expect(rewardRegion.textContent).toContain("学习积分");
    expect(rewardRegion.textContent).toContain("1.5");
    expect(rewardRegion.textContent).toContain("吃一顿火锅");
    expect(rewardRegion.textContent).toContain("还差 3.5积分");
    expect(rewardRegion.textContent).toContain("30%");
  });

  it("falls back safely when reward goal settings are malformed", () => {
    render(
      <StatsPage
        appData={{
          data: {
            records: makeStatsRecords(),
            rewards: {
              schemaVersion: 1,
              activeGoal: {
                id: "goal-1",
                title: { bad: "shape" },
                targetPoints: 5,
                createdAt: "2026-07-10T00:00:00.000Z",
              },
            },
          },
        }}
      />,
    );

    const rewardRegion = screen.getByRole("region", { name: /学习积分/i });

    expect(rewardRegion.textContent).toContain("学习积分");
    expect(rewardRegion.textContent).toContain("到设置中添加奖励目标");
  });
});

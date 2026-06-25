import { describe, it, expect } from "vitest";
import { getRecommendedFocusMode } from "./focusRecommendation";
import { DailyRecord } from "../types";

const mockRecord = (
  date: string,
  dayType: any,
  status: any,
  updatedAt = "2026-01-01T00:00:00Z"
): DailyRecord => ({
  date,
  dayType,
  status,
  updatedAt,
  createdAt: "2026-01-01T00:00:00Z",
  weekday: "Mon",
  exercised: false,
  startTime: "18:00",
  energyLevel: "normal",
  workdayBonus: { passiveListeningMinutes: 0 },
  tasks: [],
  stoppedAfter2230: false,
  noCompensatoryStayingUp: false,
  tomorrowFirstStep: "",
});

describe("focusRecommendation algorithm", () => {
  it("1. 无历史记录 -> listening_focus", () => {
    const res = getRecommendedFocusMode({}, "2026-05-20");
    expect(res.recommendedMode).toBe("listening_focus");
    expect(res.reason).toBe("first_day");
  });

  it("2. listening_focus Green -> reading_focus", () => {
    const records = { "2026-05-19": mockRecord("2026-05-19", "listening_focus", "green") };
    const res = getRecommendedFocusMode(records, "2026-05-20");
    expect(res.recommendedMode).toBe("reading_focus");
    expect(res.reason).toBe("advance_after_green");
  });

  it("3. reading_focus Green -> speaking_focus", () => {
    const records = { "2026-05-19": mockRecord("2026-05-19", "reading_focus", "green") };
    const res = getRecommendedFocusMode(records, "2026-05-20");
    expect(res.recommendedMode).toBe("speaking_focus");
    expect(res.reason).toBe("advance_after_green");
  });

  it("4. speaking_focus Green -> listening_focus", () => {
    const records = { "2026-05-19": mockRecord("2026-05-19", "speaking_focus", "green") };
    const res = getRecommendedFocusMode(records, "2026-05-20");
    expect(res.recommendedMode).toBe("listening_focus");
    expect(res.reason).toBe("advance_after_green");
  });

  it("5. 普通模式 Yellow -> recovery", () => {
    const records = { "2026-05-19": mockRecord("2026-05-19", "listening_focus", "yellow") };
    const res = getRecommendedFocusMode(records, "2026-05-20");
    expect(res.recommendedMode).toBe("recovery");
    expect(res.reason).toBe("recovery_after_non_green");
  });

  it("6. 普通模式 Red -> recovery", () => {
    const records = { "2026-05-19": mockRecord("2026-05-19", "reading_focus", "red") };
    const res = getRecommendedFocusMode(records, "2026-05-20");
    expect(res.recommendedMode).toBe("recovery");
    expect(res.reason).toBe("recovery_after_non_green");
  });

  it("7. 普通模式 Pending -> recovery", () => {
    const records = { "2026-05-19": mockRecord("2026-05-19", "speaking_focus", "pending") };
    const res = getRecommendedFocusMode(records, "2026-05-20");
    expect(res.recommendedMode).toBe("recovery");
    expect(res.reason).toBe("recovery_after_non_green");
  });

  it("8. Recovery Green -> 恢复最近非 Green 普通模式", () => {
    const records = {
      "2026-05-18": mockRecord("2026-05-18", "reading_focus", "yellow"),
      "2026-05-19": mockRecord("2026-05-19", "recovery", "green"),
    };
    const res = getRecommendedFocusMode(records, "2026-05-20");
    expect(res.recommendedMode).toBe("reading_focus");
    expect(res.reason).toBe("resume_after_recovery");
  });

  it("9. Recovery 非 Green -> recovery", () => {
    const records = {
      "2026-05-18": mockRecord("2026-05-18", "reading_focus", "red"),
      "2026-05-19": mockRecord("2026-05-19", "recovery", "yellow"),
    };
    const res = getRecommendedFocusMode(records, "2026-05-20");
    expect(res.recommendedMode).toBe("recovery");
    expect(res.reason).toBe("continue_recovery");
  });

  it("10. Recovery Green 找不到此前非 Green 普通模式 -> listening_focus", () => {
    const records = {
      "2026-05-19": mockRecord("2026-05-19", "recovery", "green"),
    };
    const res = getRecommendedFocusMode(records, "2026-05-20");
    expect(res.recommendedMode).toBe("listening_focus");
    expect(res.reason).toBe("resume_after_recovery");
  });

  it("11. 昨天缺失但有更早历史 -> recovery", () => {
    const records = { "2026-05-18": mockRecord("2026-05-18", "listening_focus", "green") };
    // 昨天是 05-19，不存在
    const res = getRecommendedFocusMode(records, "2026-05-20");
    expect(res.recommendedMode).toBe("recovery");
    expect(res.reason).toBe("missing_previous_day");
  });

  it("12. YYYY-M-D 正常参与推荐", () => {
    const records = { "2026-5-9": mockRecord("2026-5-9", "listening_focus", "green") };
    const res = getRecommendedFocusMode(records, "2026-05-10");
    expect(res.recommendedMode).toBe("reading_focus");
    expect(res.reason).toBe("advance_after_green");
  });

  it("13. 非法日期被忽略", () => {
    const records = {
      "2026-02-30": mockRecord("2026-02-30", "reading_focus", "green"), // 非法
      "2026-02-28": mockRecord("2026-02-28", "listening_focus", "green"), // 合法昨天
    };
    const res = getRecommendedFocusMode(records, "2026-03-01");
    expect(res.recommendedMode).toBe("reading_focus");
    expect(res.reason).toBe("advance_after_green");
  });

  it("14. 同一自然日重复日期正确去重, 保留 updatedAt 较新的", () => {
    const records = {
      "2026-05-19": mockRecord("2026-05-19", "listening_focus", "green", "2026-05-19T10:00:00Z"),
      "2026-5-19": mockRecord("2026-5-19", "reading_focus", "green", "2026-05-19T12:00:00Z"),
    };
    const res = getRecommendedFocusMode(records, "2026-05-20");
    // 保留了 reading_focus green, 所以 advance 之后是 speaking_focus
    expect(res.recommendedMode).toBe("speaking_focus");
  });

  it("15. 推荐函数不修改输入 records", () => {
    const records = { "2026-05-19": mockRecord("2026-05-19", "listening_focus", "green") };
    const originalString = JSON.stringify(records);
    getRecommendedFocusMode(records, "2026-05-20");
    expect(JSON.stringify(records)).toBe(originalString);
  });

  it("16. 只读取 today 之前的历史", () => {
    const records = {
      "2026-05-19": mockRecord("2026-05-19", "listening_focus", "green"),
      "2026-05-20": mockRecord("2026-05-20", "reading_focus", "red"), // 今天，应忽略
      "2026-05-21": mockRecord("2026-05-21", "speaking_focus", "red"), // 明天，应忽略
    };
    const res = getRecommendedFocusMode(records, "2026-05-20");
    // 应基于 05-19 的 listening_focus green 进行 advance
    expect(res.recommendedMode).toBe("reading_focus");
  });
});

import { DailyRecord, DayStatus, DayType } from "../types";
import { normalizeDateString, parseRecordDate, getDaysDifference } from "./date";

export interface FocusRecommendation {
  recommendedMode: DayType;
  reason:
    | "first_day"
    | "advance_after_green"
    | "recovery_after_non_green"
    | "continue_recovery"
    | "resume_after_recovery"
    | "missing_previous_day";
  basedOnDate?: string;
  basedOnMode?: DayType;
  basedOnStatus?: DayStatus;
}

export function getRecommendedFocusMode(
  records: Record<string, DailyRecord>,
  today: string
): FocusRecommendation {
  const normalizedToday = normalizeDateString(today);
  const todayTime = normalizedToday ? parseRecordDate(normalizedToday) : parseRecordDate(today);

  // 1. Filter out invalid dates, today and future dates
  // 2. Dedup by normalized date string, picking newest updatedAt
  const recordMap = new Map<string, DailyRecord>();

  for (const key of Object.keys(records)) {
    const r = records[key];
    const normDate = normalizeDateString(r.date);
    if (!normDate) continue;

    const rTime = parseRecordDate(normDate);
    if (rTime >= todayTime) continue; // Only strictly before today

    if (recordMap.has(normDate)) {
      const existing = recordMap.get(normDate)!;
      // prioritize by updatedAt
      const exTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const newTime = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
      if (newTime > exTime) {
        recordMap.set(normDate, r);
      } else if (newTime === exTime) {
        // fallback deterministic rule: created at
        if (
          r.createdAt &&
          existing.createdAt &&
          new Date(r.createdAt).getTime() > new Date(existing.createdAt).getTime()
        ) {
          recordMap.set(normDate, r);
        }
      }
    } else {
      recordMap.set(normDate, r);
    }
  }

  const validRecords = Array.from(recordMap.values());
  if (validRecords.length === 0) {
    return { recommendedMode: "listening_focus", reason: "first_day" };
  }

  // Sort strictly by UTC date descending
  validRecords.sort((a, b) => {
    const timeA = parseRecordDate(normalizeDateString(a.date)!);
    const timeB = parseRecordDate(normalizeDateString(b.date)!);
    return timeB - timeA;
  });

  const yesterday = validRecords[0];
  const yesterdayNorm = normalizeDateString(yesterday.date)!;

  // calculate difference from today
  const diffDays = getDaysDifference(normalizedToday || today, yesterdayNorm);

  if (diffDays > 1) {
    return {
      recommendedMode: "recovery",
      reason: "missing_previous_day",
      basedOnDate: yesterday.date,
      basedOnMode: yesterday.dayType,
      basedOnStatus: yesterday.status,
    };
  }

  if (yesterday.dayType !== "recovery") {
    if (yesterday.status === "green") {
      let nextMode: DayType = "listening_focus";
      if (yesterday.dayType === "listening_focus") nextMode = "reading_focus";
      if (yesterday.dayType === "reading_focus") nextMode = "speaking_focus";
      if (yesterday.dayType === "speaking_focus") nextMode = "listening_focus";

      return {
        recommendedMode: nextMode,
        reason: "advance_after_green",
        basedOnDate: yesterday.date,
        basedOnMode: yesterday.dayType,
        basedOnStatus: yesterday.status,
      };
    } else {
      return {
        recommendedMode: "recovery",
        reason: "recovery_after_non_green",
        basedOnDate: yesterday.date,
        basedOnMode: yesterday.dayType,
        basedOnStatus: yesterday.status,
      };
    }
  }

  // yesterday is recovery
  if (yesterday.status !== "green") {
    return {
      recommendedMode: "recovery",
      reason: "continue_recovery",
      basedOnDate: yesterday.date,
      basedOnMode: yesterday.dayType,
      basedOnStatus: yesterday.status,
    };
  }

  // yesterday is recovery AND green
  // find nearest previous normal non-green
  let targetMode: DayType | null = null;
  let targetRecord: DailyRecord | null = null;

  for (let i = 1; i < validRecords.length; i++) {
    const r = validRecords[i];
    if (r.dayType !== "recovery" && r.status !== "green") {
      targetMode = r.dayType;
      targetRecord = r;
      break;
    }
  }

  if (targetMode && targetRecord) {
    return {
      recommendedMode: targetMode,
      reason: "resume_after_recovery",
      basedOnDate: targetRecord.date,
      basedOnMode: targetRecord.dayType,
      basedOnStatus: targetRecord.status,
    };
  }

  // 找不到任何普通模式非 Green 记录，确定性 fallback: listening_focus
  return {
    recommendedMode: "listening_focus",
    reason: "resume_after_recovery",
    basedOnDate: yesterday.date,
    basedOnMode: yesterday.dayType,
    basedOnStatus: yesterday.status,
  };
}

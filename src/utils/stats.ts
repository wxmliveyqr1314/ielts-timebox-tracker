import { DailyRecord } from "../types";
import { getTodayStr, getPreviousDateKey, getNextDateKey, normalizeDateString, parseRecordDate } from "./date";
import { format, subDays, addDays } from "date-fns";

export function getRecentRecords(records: DailyRecord[], days: number): DailyRecord[] {
  return records.slice(0, days);
}

export function getStatusCounts(records: DailyRecord[]) {
  let green = 0, yellow = 0, red = 0, pending = 0;
  records.forEach(r => {
    if (r.status === "green") green++;
    else if (r.status === "yellow") yellow++;
    else if (r.status === "red") red++;
    else pending++;
  });
  return { green, yellow, red, pending };
}

type NormalizedRecord = DailyRecord & {
  normalizedDate: string;
  timestamp: number;
};

function normalizeRecords(records: DailyRecord[]): NormalizedRecord[] {
  return records
    .map((record) => {
      const normalizedDate = normalizeDateString(record.date);
      if (!normalizedDate) return null;

      return {
        ...record,
        normalizedDate,
        timestamp: parseRecordDate(record.date),
      };
    })
    .filter((record): record is NormalizedRecord => Boolean(record))
    .sort((a, b) => b.timestamp - a.timestamp);
}

function buildRecordByDateMap(records: DailyRecord[]): Map<string, NormalizedRecord> {
  const map = new Map<string, NormalizedRecord>();

  normalizeRecords(records).forEach((record) => {
    const existing = map.get(record.normalizedDate);

    if (!existing) {
      map.set(record.normalizedDate, record);
      return;
    }

    const existingTime = existing.updatedAt ? Date.parse(existing.updatedAt) : 0;
    const nextTime = record.updatedAt ? Date.parse(record.updatedAt) : 0;

    if (nextTime >= existingTime) {
      map.set(record.normalizedDate, record);
    }
  });

  return map;
}

export function getCurrentStreak(records: DailyRecord[]) {
  const recordMap = buildRecordByDateMap(records);
  const sorted = Array.from(recordMap.values()).sort(
    (a, b) => b.timestamp - a.timestamp
  );

  if (sorted.length === 0) return { streak: 0, lastRedDate: null };

  let expectedDate = sorted[0].normalizedDate;
  let streak = 0;
  let lastRedDate: string | null = null;

  while (true) {
    const record = recordMap.get(expectedDate);

    if (!record) {
      break;
    }

    if (record.status === "red") {
      lastRedDate = record.normalizedDate;
      break;
    }

    if (record.status === "green" || record.status === "yellow") {
      streak += 1;
    }

    const prev = getPreviousDateKey(expectedDate);
    if (!prev) break;
    expectedDate = prev;
  }

  return { streak, lastRedDate };
}

export function getLongestStreak(records: DailyRecord[]) {
  const recordMap = buildRecordByDateMap(records);
  const sorted = Array.from(recordMap.values()).sort(
    (a, b) => a.timestamp - b.timestamp
  );

  let current = 0;
  let longest = 0;
  let previousDate: string | null = null;

  for (const record of sorted) {
    if (previousDate) {
      const expectedNext = getNextDateKey(previousDate);
      if (record.normalizedDate !== expectedNext) {
        current = 0;
      }
    }

    if (record.status === "red") {
      current = 0;
    } else if (record.status === "green" || record.status === "yellow") {
      current += 1;
      longest = Math.max(longest, current);
    }

    previousDate = record.normalizedDate;
  }

  return longest;
}

export function getModuleMinutes(records: DailyRecord[]) {
  let totalMomo = 0;
  let totalDictation = 0;
  let totalReading = 0;
  let totalSpeaking = 0;
  let totalPassive = 0;
  let totalFormal = 0;

  records.forEach(r => {
    if (r.workdayBonus) {
      totalMomo += r.workdayBonus.momoMinutes || 0;
      totalPassive += r.workdayBonus.passiveListeningMinutes || 0;
      totalFormal += r.workdayBonus.momoMinutes || 0;
    }

    r.tasks.forEach(t => {
      const actual = t.actualMinutes || 0;
      if (t.category === "momo") totalMomo += actual;
      else if (t.category.startsWith("dictation")) totalDictation += actual;
      else if (t.category.startsWith("reading")) totalReading += actual;
      else if (t.category.startsWith("speaking")) totalSpeaking += actual;
      else if (t.category === "passive_listening") totalPassive += actual;
      
      if (t.category !== "passive_listening" && t.category !== "wrap_up" && t.category !== "sleep_control") {
        totalFormal += actual;
      }
    });
  });

  return { totalFormal, totalMomo, totalDictation, totalReading, totalSpeaking, totalPassive };
}

export function getSleepControlStats(records: DailyRecord[]) {
  let stoppedOnTime = 0;
  let noCompensatory = 0;
  let lateNewTask = 0;
  let compensatoryStayingUp = 0;

  records.forEach(r => {
    if (r.status === "pending" || !r.status) return;

    if (r.stoppedAfter2230 === true) stoppedOnTime++;
    else if (r.stoppedAfter2230 === false) lateNewTask++;

    if (r.noCompensatoryStayingUp === true) noCompensatory++;
    else if (r.noCompensatoryStayingUp === false) compensatoryStayingUp++;
  });
  
  return { stoppedOnTime, lateNewTask, noCompensatory, compensatoryStayingUp };
}

export function getSpeakingStats(records: DailyRecord[]) {
  let daysCompleted = 0;
  let totalMinutes = 0;

  records.forEach(r => {
    let daySpeakingMins = 0;
    r.tasks.forEach(t => {
      if (t.category.startsWith("speaking")) {
        daySpeakingMins += t.actualMinutes || 0;
      }
    });
    if (daySpeakingMins > 0) {
      daysCompleted++;
      totalMinutes += daySpeakingMins;
    }
  });

  const avgMinutes = daysCompleted > 0 ? Math.round(totalMinutes / daysCompleted) : 0;
  return { daysCompleted, totalMinutes, avgMinutes };
}

import { DailyRecord } from "../types";
import { getTodayStr } from "./date";
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

export function getCurrentStreak(records: DailyRecord[]) {
  if (records.length === 0) return { streak: 0, lastRedDate: null };
  
  let streak = 0;
  let lastRedDate: string | null = null;
  const today = getTodayStr();
  let expectedDate = today;

  for (const r of records) {
    if (r.date > expectedDate) continue;

    if (r.date !== expectedDate) {
      break; 
    }

    if (r.status === "pending" || !r.status) {
      if (r.date === today) {
        expectedDate = format(subDays(new Date(expectedDate), 1), "yyyy-MM-dd");
        continue;
      } else {
        break;
      }
    }

    if (r.status === "red") {
      lastRedDate = r.date;
      break;
    }

    if (r.status === "green" || r.status === "yellow") {
      streak++;
      expectedDate = format(subDays(new Date(expectedDate), 1), "yyyy-MM-dd");
    }
  }
  return { streak, lastRedDate };
}

export function getLongestStreak(records: DailyRecord[]) {
  let maxStreak = 0;
  let currentStreak = 0;
  let expectedNextDate: string | null = null;
  
  const reversed = [...records].reverse();
  for (const r of reversed) {
    if (r.status === "pending" || !r.status) {
      currentStreak = 0;
      expectedNextDate = null;
      continue;
    }

    if (expectedNextDate && r.date !== expectedNextDate) {
      currentStreak = 0;
    }

    if (r.status === "red") {
      currentStreak = 0;
      expectedNextDate = format(addDays(new Date(r.date), 1), "yyyy-MM-dd");
    } else if (r.status === "green" || r.status === "yellow") {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
      expectedNextDate = format(addDays(new Date(r.date), 1), "yyyy-MM-dd");
    }
  }
  return maxStreak;
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

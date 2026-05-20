import { format, differenceInCalendarDays, isValid } from "date-fns";

export function getTodayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatDateStr(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, "MMM d, yyyy");
  } catch (e) {
    return dateStr;
  }
}

export function parseRecordDate(dateStr: string): number {
  const d = new Date(dateStr);
  if (isValid(d)) return d.getTime();
  return 0;
}

export function sortRecordsByDateDesc<T extends { date: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => parseRecordDate(b.date) - parseRecordDate(a.date));
}

export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  if (!isValid(d1) || !isValid(d2)) return 0;
  return differenceInCalendarDays(d1, d2);
}

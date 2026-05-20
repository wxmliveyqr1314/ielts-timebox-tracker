import { format, differenceInCalendarDays, isValid } from "date-fns";

export function getTodayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function normalizeDateString(dateStr: string): string | null {
  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));

  const isValidDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!isValidDate) return null;

  return [
    year,
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

export function formatDateStr(dateStr: string): string {
  try {
    const normalized = normalizeDateString(dateStr);
    if (!normalized) return dateStr;
    const [year, month, day] = normalized.split("-").map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    // Since format expects a local date, we just manually format it to avoid timezone shifting
    const mStr = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    return `${mStr} ${day}, ${year}`;
  } catch (e) {
    return dateStr;
  }
}

export function parseRecordDate(dateStr: string): number {
  const normalized = normalizeDateString(dateStr);
  if (!normalized) return Number.NEGATIVE_INFINITY;

  const [year, month, day] = normalized.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function sortRecordsByDateDesc<T extends { date: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => parseRecordDate(b.date) - parseRecordDate(a.date));
}

export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  const d1 = parseRecordDate(dateStr1);
  const d2 = parseRecordDate(dateStr2);
  if (d1 === Number.NEGATIVE_INFINITY || d2 === Number.NEGATIVE_INFINITY) return 0;
  return Math.round((d1 - d2) / 86400000);
}

export function getPreviousDateKey(dateKey: string): string | null {
  const normalized = normalizeDateString(dateKey);
  if (!normalized) return null;
  
  const [year, month, day] = normalized.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day - 1));
  
  return [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    String(d.getUTCDate()).padStart(2, "0")
  ].join("-");
}

export function getNextDateKey(dateKey: string): string | null {
  const normalized = normalizeDateString(dateKey);
  if (!normalized) return null;
  
  const [year, month, day] = normalized.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + 1));
  
  return [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    String(d.getUTCDate()).padStart(2, "0")
  ].join("-");
}

import { format } from "date-fns";

export function getTodayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatDateStr(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch (e) {
    return dateStr;
  }
}

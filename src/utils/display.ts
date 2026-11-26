const FOCUS_MODE_LABELS: Record<string, string> = {
  listening_focus: "听写",
  reading_focus: "阅读",
  speaking_focus: "口语",
  recovery: "恢复日",
};

export function formatFocusMode(value: string): string {
  const known = FOCUS_MODE_LABELS[value];
  if (known) return known;

  const normalized = value.replace(/_/g, " ").trim();
  if (!normalized) return "未知";
  return "自定义学习";
}

export function formatMinutes(value: number): string {
  const minutes = Math.max(0, Math.floor(value || 0));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}分钟`;
  if (remainder === 0) return `${hours}小时`;
  return `${hours}小时${remainder}分钟`;
}

export function formatDayStatus(status: string): string {
  return ({ green: "达标", yellow: "部分完成", red: "需调整", pending: "待开始" } as Record<string, string>)[status] ?? "未知";
}

export function formatEnergyLevel(energy: string): string {
  return ({ low: "精力偏低", normal: "精力正常", high: "精力充沛" } as Record<string, string>)[energy] ?? "精力未知";
}

export function formatWeekday(weekday: string): string {
  return ({ Monday: "星期一", Tuesday: "星期二", Wednesday: "星期三", Thursday: "星期四", Friday: "星期五", Saturday: "星期六", Sunday: "星期日" } as Record<string, string>)[weekday] ?? weekday;
}

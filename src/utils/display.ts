const FOCUS_MODE_LABELS: Record<string, string> = {
  listening_focus: "Dictation",
  reading_focus: "Reading",
  speaking_focus: "Speaking",
  recovery: "Recovery",
};

export function formatFocusMode(value: string): string {
  const known = FOCUS_MODE_LABELS[value];
  if (known) return known;

  const normalized = value.replace(/_/g, " ").trim();
  if (!normalized) return "Unknown";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function formatMinutes(value: number): string {
  const minutes = Math.max(0, Math.floor(value || 0));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

import type { DayType, EnergyLevel } from "../types";

export interface ProfileEntry {
  entryId: string;
  definitionId: string;
  plannedMinutes: number;
  priority: number;
  creditOrder?: number;
  optional?: boolean;
}

export interface FocusProfileVariant {
  entries: readonly Readonly<ProfileEntry>[];
}

export interface FocusModeProfile {
  variants: Readonly<Record<EnergyLevel, FocusProfileVariant>>;
}

function entry(
  entryId: string,
  definitionId: string,
  plannedMinutes: number,
  priority: number,
  options: Pick<ProfileEntry, "creditOrder" | "optional"> = {},
): Readonly<ProfileEntry> {
  return Object.freeze({
    entryId,
    definitionId,
    plannedMinutes,
    priority,
    ...options,
  });
}

function variant(entries: Readonly<ProfileEntry>[]): FocusProfileVariant {
  return Object.freeze({ entries: Object.freeze(entries) });
}

function profile(
  low: FocusProfileVariant,
  normal: FocusProfileVariant,
  high: FocusProfileVariant,
): FocusModeProfile {
  return Object.freeze({ variants: Object.freeze({ low, normal, high }) });
}

const dictationLow = variant([
  entry("dictation:momo", "momo", 30, 80, { creditOrder: 1 }),
  entry("dictation:review", "dictation-review", 25, 90, { creditOrder: 1 }),
  entry("dictation:new", "dictation-new", 30, 100, { creditOrder: 2 }),
  entry("dictation:speaking", "speaking-shadowing", 25, 60),
  entry("dictation:wrap", "wrap-up", 10, 95),
]);

const dictationNormal = variant([
  entry("dictation:momo", "momo", 40, 80, { creditOrder: 1 }),
  entry("dictation:review", "dictation-review", 30, 90, { creditOrder: 1 }),
  entry("dictation:new", "dictation-new", 50, 100, { creditOrder: 2 }),
  entry("dictation:check", "dictation-error-check", 10, 85, { creditOrder: 3 }),
  entry("dictation:speaking", "speaking-shadowing", 30, 60),
  entry("dictation:wrap", "wrap-up", 15, 95),
]);

const dictationHigh = variant([
  ...dictationNormal.entries,
  entry("dictation:stretch", "dictation-stretch", 25, 10, {
    creditOrder: 4,
    optional: true,
  }),
]);

const readingLow = variant([
  entry("reading:momo", "momo", 30, 80, { creditOrder: 1 }),
  entry("reading:analysis", "reading-analysis", 35, 100, { creditOrder: 2 }),
  entry("reading:notes", "reading-notes", 15, 85, { creditOrder: 3 }),
  entry("reading:speaking", "speaking-shadowing", 25, 60),
  entry("reading:dictation", "dictation-review", 20, 55, { creditOrder: 1 }),
  entry("reading:wrap", "wrap-up", 10, 95),
]);

const readingNormal = variant([
  entry("reading:momo", "momo", 40, 80, { creditOrder: 1 }),
  entry("reading:scan", "reading-scan", 10, 75, { creditOrder: 1 }),
  entry("reading:analysis", "reading-analysis", 45, 100, { creditOrder: 2 }),
  entry("reading:notes", "reading-notes", 25, 85, { creditOrder: 3 }),
  entry("reading:speaking", "speaking-shadowing", 30, 60),
  entry("reading:dictation", "dictation-review", 25, 55, { creditOrder: 1 }),
  entry("reading:wrap", "wrap-up", 15, 95),
]);

const readingHigh = variant([
  ...readingNormal.entries,
  entry("reading:stretch", "reading-stretch", 30, 10, {
    creditOrder: 4,
    optional: true,
  }),
]);

const speakingLow = variant([
  entry("speaking:momo", "momo", 30, 80, { creditOrder: 1 }),
  entry("speaking:conversation", "speaking-conversation", 20, 100),
  entry("speaking:retake", "speaking-retake", 10, 90),
  entry("speaking:dictation-review", "light-dictation-review", 20, 60),
  entry("speaking:wrap", "wrap-up", 10, 95),
]);

const speakingNormal = variant([
  entry("speaking:momo", "momo", 40, 80, { creditOrder: 1 }),
  entry("speaking:shadowing", "speaking-shadowing", 15, 75),
  entry("speaking:conversation", "speaking-conversation", 20, 100),
  entry("speaking:retake", "speaking-retake", 10, 90),
  entry("speaking:reading-review", "light-reading-review", 30, 60),
  entry("speaking:wrap", "wrap-up", 15, 95),
]);

const speakingHigh = variant([
  ...speakingNormal.entries,
  entry("speaking:stretch", "speaking-stretch", 20, 10, { optional: true }),
]);

const recoveryLow = variant([
  entry("recovery:momo", "momo", 15, 90, { creditOrder: 1 }),
  entry("recovery:dictation", "dictation-review", 15, 100, { creditOrder: 1 }),
  entry("recovery:speaking", "speaking-shadowing", 10, 80),
  entry("recovery:wrap", "wrap-up", 5, 95),
]);

const recoveryNormal = variant([
  entry("recovery:momo", "momo", 20, 90, { creditOrder: 1 }),
  entry("recovery:dictation", "dictation-review", 20, 100, { creditOrder: 1 }),
  entry("recovery:speaking", "speaking-shadowing", 15, 80),
  entry("recovery:wrap", "wrap-up", 5, 95),
]);

export const FOCUS_PROFILES: Readonly<Record<DayType, FocusModeProfile>> =
  Object.freeze({
    listening_focus: profile(dictationLow, dictationNormal, dictationHigh),
    reading_focus: profile(readingLow, readingNormal, readingHigh),
    speaking_focus: profile(speakingLow, speakingNormal, speakingHigh),
    recovery: profile(recoveryLow, recoveryNormal, recoveryNormal),
  });

export function getProfileVariant(
  dayType: DayType,
  energy: EnergyLevel,
): FocusProfileVariant {
  return FOCUS_PROFILES[dayType].variants[energy];
}

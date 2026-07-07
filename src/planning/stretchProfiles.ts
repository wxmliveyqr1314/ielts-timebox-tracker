import type { DayType, StretchStrategy } from "../types";
import { getTaskDefinition } from "./taskRegistry";

export interface StretchProfileEntry {
  entryId: string;
  definitionId: string;
  plannedMinutes: number;
  priority: number;
}

export interface StretchProfile {
  dayType: DayType;
  strategy: StretchStrategy;
  entries: readonly StretchProfileEntry[];
}

function entry(
  entryId: string,
  definitionId: string,
  plannedMinutes: number,
  priority: number,
): StretchProfileEntry {
  getTaskDefinition(definitionId);
  return Object.freeze({ entryId, definitionId, plannedMinutes, priority });
}

function profile(
  dayType: DayType,
  strategy: StretchStrategy,
  entries: readonly StretchProfileEntry[],
): StretchProfile {
  return Object.freeze({ dayType, strategy, entries: Object.freeze([...entries]) });
}

const PROFILES: Readonly<Record<DayType, Readonly<Record<StretchStrategy, StretchProfile>>>> =
  Object.freeze({
    listening_focus: Object.freeze({
      same_focus: profile("listening_focus", "same_focus", [
        entry("stretch:listening:same:momo", "momo", 20, 90),
        entry("stretch:listening:same:review", "dictation-review", 25, 85),
        entry("stretch:listening:same:new", "dictation-new", 30, 80),
        entry("stretch:listening:same:check", "dictation-error-check", 20, 70),
      ]),
      balanced: profile("listening_focus", "balanced", [
        entry("stretch:listening:balanced:reading", "reading-analysis", 30, 90),
        entry("stretch:listening:balanced:speaking", "speaking-shadowing", 20, 80),
        entry("stretch:listening:balanced:momo", "momo", 20, 75),
        entry("stretch:listening:balanced:notes", "reading-notes", 25, 70),
      ]),
    }),
    reading_focus: Object.freeze({
      same_focus: profile("reading_focus", "same_focus", [
        entry("stretch:reading:same:analysis", "reading-analysis", 35, 90),
        entry("stretch:reading:same:notes", "reading-notes", 25, 80),
        entry("stretch:reading:same:scan", "reading-scan", 20, 75),
        entry("stretch:reading:same:timed", "reading-stretch", 30, 70),
      ]),
      balanced: profile("reading_focus", "balanced", [
        entry("stretch:reading:balanced:dictation", "dictation-review", 25, 90),
        entry("stretch:reading:balanced:speaking", "speaking-shadowing", 20, 80),
        entry("stretch:reading:balanced:momo", "momo", 20, 75),
        entry("stretch:reading:balanced:check", "dictation-error-check", 15, 70),
      ]),
    }),
    speaking_focus: Object.freeze({
      same_focus: profile("speaking_focus", "same_focus", [
        entry("stretch:speaking:same:conversation", "speaking-conversation", 30, 90),
        entry("stretch:speaking:same:retake", "speaking-retake", 20, 80),
        entry("stretch:speaking:same:shadowing", "speaking-shadowing", 20, 75),
        entry("stretch:speaking:same:momo", "momo", 20, 70),
      ]),
      balanced: profile("speaking_focus", "balanced", [
        entry("stretch:speaking:balanced:reading", "reading-analysis", 30, 90),
        entry("stretch:speaking:balanced:dictation", "dictation-review", 25, 80),
        entry("stretch:speaking:balanced:momo", "momo", 20, 75),
      ]),
    }),
    recovery: Object.freeze({
      same_focus: profile("recovery", "same_focus", [
        entry("stretch:recovery:same:momo", "momo", 20, 90),
        entry("stretch:recovery:same:dictation", "dictation-review", 20, 80),
      ]),
      balanced: profile("recovery", "balanced", [
        entry("stretch:recovery:balanced:momo", "momo", 15, 90),
        entry("stretch:recovery:balanced:notes", "reading-notes", 15, 80),
        entry("stretch:recovery:balanced:dictation", "dictation-review", 15, 70),
      ]),
    }),
  });

export function getStretchProfile(
  dayType: DayType,
  strategy: StretchStrategy,
): StretchProfile {
  return PROFILES[dayType][strategy];
}

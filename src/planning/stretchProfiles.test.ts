import { describe, expect, it } from "vitest";
import type { DayType, StretchStrategy } from "../types";
import { getStretchProfile } from "./stretchProfiles";

const modes: DayType[] = [
  "listening_focus",
  "reading_focus",
  "speaking_focus",
  "recovery",
];
const strategies: StretchStrategy[] = ["same_focus", "balanced"];

describe("stretchProfiles", () => {
  it("defines entries for every mode and strategy", () => {
    for (const mode of modes) {
      for (const strategy of strategies) {
        expect(getStretchProfile(mode, strategy).entries.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps recovery stretch intentionally light", () => {
    for (const strategy of strategies) {
      const total = getStretchProfile("recovery", strategy).entries.reduce(
        (sum, entry) => sum + entry.plannedMinutes,
        0,
      );

      expect(total).toBeLessThanOrEqual(45);
    }
  });

  it("balanced dictation includes non-dictation work", () => {
    const definitions = getStretchProfile("listening_focus", "balanced").entries.map(
      (entry) => entry.definitionId,
    );

    expect(definitions).toContain("reading-analysis");
    expect(definitions).toContain("speaking-shadowing");
  });

  it("same focus dictation starts with current-mode work", () => {
    const definitions = getStretchProfile("listening_focus", "same_focus").entries.map(
      (entry) => entry.definitionId,
    );

    expect(definitions.slice(0, 2)).toEqual(["momo", "dictation-review"]);
  });
});

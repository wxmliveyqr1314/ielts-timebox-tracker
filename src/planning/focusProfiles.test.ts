import { describe, expect, it } from "vitest";
import { FOCUS_PROFILES, getProfileVariant } from "./focusProfiles";
import { TASK_REGISTRY, getTaskDefinition } from "./taskRegistry";

describe("focus profiles", () => {
  it.each([
    ["listening_focus", "low", 120],
    ["listening_focus", "normal", 175],
    ["listening_focus", "high", 200],
    ["reading_focus", "low", 135],
    ["reading_focus", "normal", 190],
    ["reading_focus", "high", 220],
    ["speaking_focus", "low", 90],
    ["speaking_focus", "normal", 130],
    ["speaking_focus", "high", 150],
    ["recovery", "low", 45],
    ["recovery", "normal", 60],
    ["recovery", "high", 60],
  ] as const)("%s %s totals %i focused minutes", (mode, energy, expected) => {
    const total = getProfileVariant(mode, energy).entries.reduce(
      (sum, entry) => sum + entry.plannedMinutes,
      0,
    );

    expect(total).toBe(expected);
  });

  it("uses the normal Recovery entries for high energy", () => {
    expect(getProfileVariant("recovery", "high")).toEqual(
      getProfileVariant("recovery", "normal"),
    );
  });

  it("references only registered definitions and unique entry IDs", () => {
    for (const profile of Object.values(FOCUS_PROFILES)) {
      for (const variant of Object.values(profile.variants)) {
        const entryIds = variant.entries.map((entry) => entry.entryId);
        expect(new Set(entryIds).size).toBe(entryIds.length);

        variant.entries.forEach((entry) => {
          expect(TASK_REGISTRY[entry.definitionId]).toBeDefined();
        });
      }
    }
  });

  it("keeps stretch work separate and optional", () => {
    for (const mode of [
      "listening_focus",
      "reading_focus",
      "speaking_focus",
    ] as const) {
      const normalIds = new Set(
        getProfileVariant(mode, "normal").entries.map((entry) => entry.entryId),
      );
      const highOnly = getProfileVariant(mode, "high").entries.filter(
        (entry) => !normalIds.has(entry.entryId),
      );

      expect(highOnly).toHaveLength(1);
      expect(highOnly[0].optional).toBe(true);
    }
  });

  it("returns registered definitions and rejects unknown IDs", () => {
    expect(getTaskDefinition("momo").creditGroup).toBe("momo");
    expect(() => getTaskDefinition("missing-task")).toThrow(
      "Unknown task definition: missing-task",
    );
  });

  it("exposes frozen registry and profile data", () => {
    expect(Object.isFrozen(TASK_REGISTRY)).toBe(true);
    expect(Object.isFrozen(FOCUS_PROFILES)).toBe(true);
    expect(Object.isFrozen(getProfileVariant("reading_focus", "normal").entries)).toBe(
      true,
    );
  });
});

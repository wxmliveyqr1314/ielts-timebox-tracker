import { describe, expect, it } from "vitest";
import { formatFocusMode, formatMinutes } from "./display";

describe("display helpers", () => {
  it.each([
    ["listening_focus", "Dictation"],
    ["reading_focus", "Reading"],
    ["speaking_focus", "Speaking"],
    ["recovery", "Recovery"],
  ])("formats %s", (value, expected) => {
    expect(formatFocusMode(value)).toBe(expected);
  });

  it("formats unknown values without exposing underscores", () => {
    expect(formatFocusMode("custom_mode")).toBe("Custom mode");
  });

  it.each([
    [0, "0m"],
    [59, "59m"],
    [60, "1h"],
    [125, "2h 5m"],
  ])("formats %i minutes", (value, expected) => {
    expect(formatMinutes(value)).toBe(expected);
  });
});

import { describe, expect, it } from "vitest";
import { formatFocusMode, formatMinutes } from "./display";

describe("display helpers", () => {
  it.each([
    ["listening_focus", "听写"],
    ["reading_focus", "阅读"],
    ["speaking_focus", "口语"],
    ["recovery", "恢复日"],
  ])("formats %s", (value, expected) => {
    expect(formatFocusMode(value)).toBe(expected);
  });

  it("formats unknown values without exposing underscores", () => {
    expect(formatFocusMode("custom_mode")).toBe("自定义学习");
  });

  it.each([
    [0, "0分钟"],
    [59, "59分钟"],
    [60, "1小时"],
    [125, "2小时5分钟"],
  ])("formats %i minutes", (value, expected) => {
    expect(formatMinutes(value)).toBe(expected);
  });
});

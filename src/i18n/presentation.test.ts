import { describe, expect, it } from "vitest";
import { TASK_REGISTRY } from "../planning/taskRegistry";
import { formatTaskTitle, localizeTaskDefinition, TASK_COPY_ZH } from "./taskCopy";
import { formatDataHealthIssue, formatWallpaperError } from "./feedback";
import { formatDayStatus, formatEnergyLevel, formatWeekday } from "../utils/display";
import { formatDateStr } from "../utils/date";

describe("Simplified Chinese presentation", () => {
  it("covers every system task without changing registry definitions or task semantics", () => {
    expect(Object.keys(TASK_COPY_ZH).sort()).toEqual(Object.keys(TASK_REGISTRY).sort());
    const before = JSON.stringify(TASK_REGISTRY);
    for (const definition of Object.values(TASK_REGISTRY)) {
      const localized = localizeTaskDefinition(definition);
      for (const field of ["title", "description", "instruction", "doneCriteria"] as const) {
        expect(localized[field]).toMatch(/[\u3400-\u9fff]/);
      }
      expect(localized.id).toBe(definition.id);
      expect(localized.category).toBe(definition.category);
      expect(localized.statusRole).toBe(definition.statusRole);
      expect(localized.creditGroup).toBe(definition.creditGroup);
      expect(localized.capacityKind).toBe(definition.capacityKind);
      expect(localized.minMinutes).toBe(definition.minMinutes);
      expect(localized.rewardEligible).toBe(definition.rewardEligible);
    }
    expect(JSON.stringify(TASK_REGISTRY)).toBe(before);
  });

  it("translates known English legacy titles while preserving custom English content", () => {
    const legacy = { title: "Speaking shadowing", notes: "Describe a memorable journey" };
    expect(formatTaskTitle(legacy)).toBe("口语跟读");
    expect(legacy.title).toBe("Speaking shadowing");
    expect(legacy.notes).toBe("Describe a memorable journey");
    expect(formatTaskTitle({ title: "Describe a memorable journey" })).toBe("Describe a memorable journey");
    expect(formatTaskTitle({ title: "自定义任务" })).toBe("自定义任务");
  });

  it("formats Chinese dates, weekdays, energy and status labels", () => {
    expect(formatDateStr("2026-6-27")).toBe("2026年6月27日");
    expect(formatDateStr("invalid")).toBe("invalid");
    expect(formatWeekday("Saturday")).toBe("星期六");
    expect(formatDayStatus("green")).toBe("达标");
    expect(formatDayStatus("pending")).toBe("待开始");
    expect(formatEnergyLevel("normal")).toBe("精力正常");
  });

  it("localizes feedback while keeping diagnostics and localized validation messages intact", () => {
    const issue = { severity: "error" as const, code: "INVALID_UPDATED_AT", message: "updatedAt is missing or invalid" };
    expect(formatDataHealthIssue(issue)).toContain("修改时间");
    expect(issue.message).toBe("updatedAt is missing or invalid");
    expect(formatWallpaperError(new Error("Failed to fetch"), "壁纸暂不可用")).toBe("壁纸暂不可用");
    expect(formatWallpaperError(new Error("请选择较小的图片"), "壁纸暂不可用")).toBe("请选择较小的图片");
  });
});

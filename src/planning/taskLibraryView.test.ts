import { describe, expect, it } from "vitest";

import { TASK_REGISTRY, type TaskDefinition } from "./taskRegistry";
import {
  buildTaskLibraryGroups,
  formatTaskLibraryBadge,
} from "./taskLibraryView";

describe("task library view model", () => {
  it("places every task registry item exactly once", () => {
    const groups = buildTaskLibraryGroups(TASK_REGISTRY);
    const taskIds = groups.flatMap((group) => group.tasks.map((task) => task.id));

    expect(taskIds.sort()).toEqual(Object.keys(TASK_REGISTRY).sort());
    expect(new Set(taskIds).size).toBe(taskIds.length);
  });

  it("uses stable study-oriented group order", () => {
    const groups = buildTaskLibraryGroups(TASK_REGISTRY);

    expect(groups.map((group) => group.id)).toEqual([
      "vocabulary",
      "listening",
      "reading",
      "speaking",
      "review-planning",
      "sleep-protection",
    ]);
  });

  it("groups representative tasks by learning purpose", () => {
    const groups = buildTaskLibraryGroups(TASK_REGISTRY);
    const byId = Object.fromEntries(groups.map((group) => [group.id, group]));

    expect(byId.vocabulary.tasks.map((task) => task.id)).toContain("momo");
    expect(byId.listening.tasks.map((task) => task.id)).toEqual(
      expect.arrayContaining([
        "dictation-review",
        "dictation-new",
        "passive-listening",
      ]),
    );
    expect(byId.reading.tasks.map((task) => task.id)).toContain(
      "reading-analysis",
    );
    expect(byId.speaking.tasks.map((task) => task.id)).toContain(
      "speaking-conversation",
    );
    expect(byId["review-planning"].tasks.map((task) => task.id)).toContain(
      "wrap-up",
    );
    expect(byId["sleep-protection"].tasks.map((task) => task.id)).toEqual([
      "sleep-stop-heavy",
      "sleep-no-compensation",
    ]);
  });

  it("does not mutate registry definitions", () => {
    const before = TASK_REGISTRY.momo;

    buildTaskLibraryGroups(TASK_REGISTRY);

    expect(TASK_REGISTRY.momo).toBe(before);
  });

  it("places unknown learning purpose into Other", () => {
    const customTask: Readonly<TaskDefinition> = {
      ...TASK_REGISTRY.momo,
      id: "future-writing",
      title: "Future writing task",
      category: "other",
      skill: "writing",
    };
    const groups = buildTaskLibraryGroups({
      "future-writing": customTask,
    });

    expect(groups.map((group) => group.id)).toEqual(["other"]);
    expect(groups[0].tasks[0].id).toBe("future-writing");
  });

  it("formats compact task metadata badges", () => {
    expect(formatTaskLibraryBadge("status", "required")).toBe("必做");
    expect(formatTaskLibraryBadge("status", "ignored")).toBe("不影响状态");
    expect(formatTaskLibraryBadge("capacity", "focused")).toBe("专注学习");
    expect(formatTaskLibraryBadge("capacity", "parallel")).toBe("可并行");
    expect(formatTaskLibraryBadge("reward", true)).toBe("可计分");
    expect(formatTaskLibraryBadge("reward", false)).toBe("不计分");
    expect(formatTaskLibraryBadge("formal", true)).toBe("正式学习");
    expect(formatTaskLibraryBadge("formal", false)).toBe("辅助任务");
    expect(formatTaskLibraryBadge("credit", "dictation")).toBe(
      "听写可抵扣",
    );
  });
});

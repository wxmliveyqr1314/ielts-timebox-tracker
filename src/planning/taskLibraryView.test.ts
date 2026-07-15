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
    expect(formatTaskLibraryBadge("status", "required")).toBe("Required");
    expect(formatTaskLibraryBadge("status", "ignored")).toBe("Ignored");
    expect(formatTaskLibraryBadge("capacity", "focused")).toBe("Focused");
    expect(formatTaskLibraryBadge("capacity", "parallel")).toBe("Parallel");
    expect(formatTaskLibraryBadge("reward", true)).toBe("Reward");
    expect(formatTaskLibraryBadge("reward", false)).toBe("No reward");
    expect(formatTaskLibraryBadge("formal", true)).toBe("Formal");
    expect(formatTaskLibraryBadge("formal", false)).toBe("Support");
    expect(formatTaskLibraryBadge("credit", "dictation")).toBe(
      "Dictation credit",
    );
  });
});

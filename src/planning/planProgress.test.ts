import { describe, expect, it } from "vitest";
import type { TaskCheckItem } from "../types";
import { mergePlanProgress, previewPlanDifference } from "./planProgress";

function task(
  id: string,
  overrides: Partial<TaskCheckItem> = {},
): TaskCheckItem {
  return {
    id,
    title: "Task",
    category: "other",
    plannedMinutes: 20,
    actualMinutes: 0,
    completed: false,
    isCore: true,
    isEveningTask: true,
    ...overrides,
  };
}

describe("plan progress merge", () => {
  it("preserves progress by stable entry ID while keeping the new target", () => {
    const current = [
      task("old", {
        entryId: "reading:analysis",
        definitionId: "reading-analysis",
        plannedMinutes: 45,
        actualMinutes: 25,
        completed: true,
        notes: "real work",
      }),
    ];
    const next = [
      task("plan:reading:analysis", {
        entryId: "reading:analysis",
        definitionId: "reading-analysis",
        plannedMinutes: 35,
      }),
    ];

    expect(mergePlanProgress(current, next)).toEqual([
      expect.objectContaining({
        id: "plan:reading:analysis",
        plannedMinutes: 35,
        actualMinutes: 25,
        completed: true,
        notes: "real work",
      }),
    ]);
  });

  it("falls back to definition and title across profile entry IDs", () => {
    const current = [
      task("old", {
        title: "Momo vocabulary",
        category: "momo",
        definitionId: "momo",
        entryId: "dictation:momo",
        actualMinutes: 15,
      }),
    ];
    const next = [
      task("new", {
        title: "Momo vocabulary",
        category: "momo",
        definitionId: "momo",
        entryId: "reading:momo",
      }),
    ];

    expect(mergePlanProgress(current, next)[0].actualMinutes).toBe(15);
  });

  it("falls back to category and title for legacy tasks", () => {
    const current = [
      task("task_1", {
        title: "Legacy review",
        category: "dictation_review",
        actualMinutes: 10,
        notes: "legacy note",
      }),
    ];
    const next = [
      task("plan:review", {
        title: "Legacy review",
        category: "dictation_review",
        definitionId: "dictation-review",
        entryId: "dictation:review",
      }),
    ];

    expect(mergePlanProgress(current, next)[0]).toEqual(
      expect.objectContaining({ actualMinutes: 10, notes: "legacy note" }),
    );
  });

  it("never lets two new tasks claim one old task", () => {
    const current = [
      task("old", {
        title: "Repeated",
        category: "reading_scan",
        definitionId: "reading-scan",
        actualMinutes: 12,
      }),
    ];
    const next = [
      task("new-1", {
        title: "Repeated",
        category: "reading_scan",
        definitionId: "reading-scan",
        entryId: "reading:scan",
      }),
      task("new-2", {
        title: "Repeated",
        category: "reading_scan",
        definitionId: "reading-scan",
        entryId: "reading:stretch",
      }),
    ];

    const merged = mergePlanProgress(current, next);
    expect(merged[0].actualMinutes).toBe(12);
    expect(merged[1].actualMinutes).toBe(0);
  });

  it("retains unmatched real progress as a non-target carried task", () => {
    const current = [
      task("old-speaking", {
        title: "Speaking practice",
        category: "speaking_ai_conversation",
        entryId: "speaking:conversation",
        actualMinutes: 25,
        completed: true,
        notes: "real work",
      }),
    ];

    expect(mergePlanProgress(current, [])).toContainEqual(
      expect.objectContaining({
        id: "carried:old-speaking",
        actualMinutes: 25,
        completed: true,
        notes: "real work",
        carriedForward: true,
        isCore: false,
        isEveningTask: false,
        plannedMinutes: 0,
        statusRole: "ignored",
      }),
    );
  });

  it("drops unmatched untouched tasks", () => {
    expect(mergePlanProgress([task("untouched")], [])).toEqual([]);
  });

  it("retains completed or noted tasks even with zero actual minutes", () => {
    const current = [
      task("completed", { completed: true }),
      task("noted", { notes: "keep this" }),
    ];

    const merged = mergePlanProgress(current, []);
    expect(merged.map((item) => item.id)).toEqual([
      "carried:completed",
      "carried:noted",
    ]);
  });

  it("does not add repeated carried prefixes on later regeneration", () => {
    const current = [
      task("carried:old", {
        carriedForward: true,
        actualMinutes: 5,
        plannedMinutes: 0,
      }),
    ];

    expect(mergePlanProgress(current, [])[0].id).toBe("carried:old");
  });

  it("previews additions, removals, minute changes, and carried progress", () => {
    const current = [
      task("same-old", {
        entryId: "same",
        title: "Same",
        plannedMinutes: 20,
      }),
      task("removed", {
        entryId: "removed",
        title: "Removed",
        actualMinutes: 8,
      }),
      task("untouched", { entryId: "untouched", title: "Untouched" }),
    ];
    const next = [
      task("same-new", {
        entryId: "same",
        title: "Same",
        plannedMinutes: 35,
      }),
      task("added", { entryId: "added", title: "Added" }),
    ];

    const preview = previewPlanDifference(current, next);
    expect(preview.added.map((item) => item.title)).toEqual(["Added"]);
    expect(preview.removed.map((item) => item.title)).toEqual([
      "Removed",
      "Untouched",
    ]);
    expect(preview.changed).toEqual([
      {
        entryId: "same",
        title: "Same",
        fromMinutes: 20,
        toMinutes: 35,
      },
    ]);
    expect(preview.carriedForward.map((item) => item.title)).toEqual([
      "Removed",
    ]);
  });

  it("does not mutate current or next tasks", () => {
    const current = [task("current", { actualMinutes: 10 })];
    const next = [task("next")];
    const currentBefore = structuredClone(current);
    const nextBefore = structuredClone(next);

    previewPlanDifference(current, next);
    mergePlanProgress(current, next);

    expect(current).toEqual(currentBefore);
    expect(next).toEqual(nextBefore);
  });

  it("preserves matching stretch progress during regeneration", () => {
    const current = task("stretch:stretch:listening:same:momo", {
      entryId: "stretch:listening:same:momo",
      definitionId: "momo",
      plannedMinutes: 20,
      actualMinutes: 15,
      completed: false,
      planRole: "stretch",
      capacityKind: "stretch",
      statusRole: "optional",
    });
    const next = task("stretch:stretch:listening:same:momo", {
      entryId: "stretch:listening:same:momo",
      definitionId: "momo",
      plannedMinutes: 25,
      actualMinutes: 0,
      completed: false,
      planRole: "stretch",
      capacityKind: "stretch",
      statusRole: "optional",
    });

    const result = mergePlanProgress([current], [next]);
    expect(result[0]).toMatchObject({
      plannedMinutes: 25,
      actualMinutes: 15,
      planRole: "stretch",
    });
  });
});

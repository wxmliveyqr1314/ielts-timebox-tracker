import type { TaskCheckItem } from "../types";

export interface PlanDifference {
  added: TaskCheckItem[];
  removed: TaskCheckItem[];
  changed: Array<{
    entryId: string;
    title: string;
    fromMinutes: number;
    toMinutes: number;
  }>;
  carriedForward: TaskCheckItem[];
}

interface TaskMatch {
  currentIndex: number;
  nextIndex: number;
}

function hasRealProgress(task: TaskCheckItem): boolean {
  return (
    task.actualMinutes > 0 ||
    task.completed ||
    Boolean(task.notes && task.notes.trim().length > 0)
  );
}

function findUnclaimedIndex(
  current: TaskCheckItem[],
  claimed: Set<number>,
  predicate: (task: TaskCheckItem) => boolean,
): number {
  return current.findIndex(
    (task, index) => !claimed.has(index) && predicate(task),
  );
}

function matchTasks(
  current: TaskCheckItem[],
  next: TaskCheckItem[],
): TaskMatch[] {
  const claimed = new Set<number>();
  const matches: TaskMatch[] = [];

  next.forEach((nextTask, nextIndex) => {
    let currentIndex = -1;

    if (nextTask.entryId) {
      currentIndex = findUnclaimedIndex(
        current,
        claimed,
        (task) => task.entryId === nextTask.entryId,
      );
    }

    if (currentIndex < 0 && nextTask.definitionId) {
      currentIndex = findUnclaimedIndex(
        current,
        claimed,
        (task) =>
          task.definitionId === nextTask.definitionId &&
          task.title === nextTask.title,
      );
    }

    if (currentIndex < 0) {
      currentIndex = findUnclaimedIndex(
        current,
        claimed,
        (task) =>
          task.category === nextTask.category && task.title === nextTask.title,
      );
    }

    if (currentIndex >= 0) {
      claimed.add(currentIndex);
      matches.push({ currentIndex, nextIndex });
    }
  });

  return matches;
}

function toCarriedTask(task: TaskCheckItem): TaskCheckItem {
  return {
    ...task,
    id: task.id.startsWith("carried:") ? task.id : `carried:${task.id}`,
    plannedMinutes: 0,
    isCore: false,
    isEveningTask: false,
    statusRole: "ignored",
    carriedForward: true,
  };
}

export function previewPlanDifference(
  current: TaskCheckItem[],
  next: TaskCheckItem[],
): PlanDifference {
  const matches = matchTasks(current, next);
  const matchedCurrent = new Set(matches.map((match) => match.currentIndex));
  const matchedNext = new Set(matches.map((match) => match.nextIndex));

  const added = next
    .filter((_, index) => !matchedNext.has(index))
    .map((task) => ({ ...task }));
  const removed = current
    .filter((_, index) => !matchedCurrent.has(index))
    .map((task) => ({ ...task }));
  const carriedForward = removed
    .filter(hasRealProgress)
    .map(toCarriedTask);
  const changed = matches.flatMap(({ currentIndex, nextIndex }) => {
    const currentTask = current[currentIndex];
    const nextTask = next[nextIndex];
    if (currentTask.plannedMinutes === nextTask.plannedMinutes) return [];
    return [
      {
        entryId: nextTask.entryId ?? nextTask.id,
        title: nextTask.title,
        fromMinutes: currentTask.plannedMinutes,
        toMinutes: nextTask.plannedMinutes,
      },
    ];
  });

  return { added, removed, changed, carriedForward };
}

export function mergePlanProgress(
  current: TaskCheckItem[],
  next: TaskCheckItem[],
): TaskCheckItem[] {
  const matches = matchTasks(current, next);
  const currentByNext = new Map(
    matches.map(({ currentIndex, nextIndex }) => [nextIndex, currentIndex]),
  );
  const matchedCurrent = new Set(matches.map((match) => match.currentIndex));

  const merged = next.map((nextTask, nextIndex) => {
    const currentIndex = currentByNext.get(nextIndex);
    if (currentIndex === undefined) return { ...nextTask };

    const currentTask = current[currentIndex];
    return {
      ...nextTask,
      actualMinutes: currentTask.actualMinutes,
      completed: currentTask.completed,
      notes: currentTask.notes ?? nextTask.notes,
    };
  });

  const carried = current
    .filter(
      (task, index) => !matchedCurrent.has(index) && hasRealProgress(task),
    )
    .map(toCarriedTask);

  return [...merged, ...carried];
}

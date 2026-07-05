import type { DailyRecord, TaskCheckItem } from "../types";
import { calculateColorStatus } from "./status";

function isStoppedOnTimeTask(task: TaskCheckItem): boolean {
  return (
    task.category === "sleep_control" &&
    (task.definitionId === "sleep-stop-heavy" ||
      task.entryId === "control:sleep-stop-heavy" ||
      task.title.includes("22:30"))
  );
}

function isNoCompensationTask(task: TaskCheckItem): boolean {
  return (
    task.category === "sleep_control" &&
    (task.definitionId === "sleep-no-compensation" ||
      task.entryId === "control:sleep-no-compensation" ||
      task.title.includes("No compensatory") ||
      task.title.includes("没有补偿"))
  );
}

export function syncSleepControlTasks(
  record: DailyRecord,
  updates: {
    stoppedAfter2230?: boolean;
    noCompensatoryStayingUp?: boolean;
  },
): DailyRecord {
  const nextRecord = {
    ...record,
    ...updates,
    tasks: record.tasks.map((task) => {
      if (
        typeof updates.stoppedAfter2230 === "boolean" &&
        isStoppedOnTimeTask(task)
      ) {
        return { ...task, completed: updates.stoppedAfter2230 };
      }

      if (
        typeof updates.noCompensatoryStayingUp === "boolean" &&
        isNoCompensationTask(task)
      ) {
        return { ...task, completed: updates.noCompensatoryStayingUp };
      }

      return task;
    }),
  };

  return {
    ...nextRecord,
    status: calculateColorStatus(nextRecord),
    updatedAt: new Date().toISOString(),
  };
}

export function syncRecordFieldsFromSleepControlTasks(
  record: DailyRecord,
): DailyRecord {
  const stoppedTask = record.tasks.find(isStoppedOnTimeTask);
  const noStayingUpTask = record.tasks.find(isNoCompensationTask);

  const nextRecord = {
    ...record,
    stoppedAfter2230:
      typeof stoppedTask?.completed === "boolean"
        ? stoppedTask.completed
        : record.stoppedAfter2230,
    noCompensatoryStayingUp:
      typeof noStayingUpTask?.completed === "boolean"
        ? noStayingUpTask.completed
        : record.noCompensatoryStayingUp,
  };

  return {
    ...nextRecord,
    status: calculateColorStatus(nextRecord),
    updatedAt: new Date().toISOString(),
  };
}

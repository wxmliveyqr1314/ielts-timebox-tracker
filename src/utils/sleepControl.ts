import { DailyRecord } from "../types";
import { calculateColorStatus } from "./status";

export function syncSleepControlTasks(
  record: DailyRecord,
  updates: {
    stoppedAfter2230?: boolean;
    noCompensatoryStayingUp?: boolean;
  }
): DailyRecord {
  const nextRecord = {
    ...record,
    ...updates,
    tasks: record.tasks.map((task) => {
      if (task.category !== "sleep_control") return task;

      if (
        typeof updates.stoppedAfter2230 === "boolean" &&
        task.title.includes("22:30")
      ) {
        return {
          ...task,
          completed: updates.stoppedAfter2230,
        };
      }

      if (
        typeof updates.noCompensatoryStayingUp === "boolean" &&
        (task.title.includes("补偿性熬夜") || task.title.includes("没有补偿"))
      ) {
        return {
          ...task,
          completed: updates.noCompensatoryStayingUp,
        };
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
  record: DailyRecord
): DailyRecord {
  const stoppedTask = record.tasks.find(
    (task) =>
      task.category === "sleep_control" &&
      task.title.includes("22:30")
  );

  const noStayingUpTask = record.tasks.find(
    (task) =>
      task.category === "sleep_control" &&
      (task.title.includes("补偿性熬夜") || task.title.includes("没有补偿"))
  );

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

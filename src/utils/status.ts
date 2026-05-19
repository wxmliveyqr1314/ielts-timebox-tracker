import { DailyRecord, DayStatus, TaskCheckItem, DayType } from "../types";

export const isMomoTask = (task: TaskCheckItem) => task.category === "momo";

export const isDictationTask = (task: TaskCheckItem) =>
  task.category.startsWith("dictation");

export const isReadingTask = (task: TaskCheckItem) =>
  task.category.startsWith("reading");

export const isSpeakingTask = (task: TaskCheckItem) =>
  task.category.startsWith("speaking");

export const isWrapUpTask = (task: TaskCheckItem) =>
  task.category === "wrap_up";

export const isSleepControlTask = (task: TaskCheckItem) =>
  task.category === "sleep_control";

export const isMainTaskForDay = (task: TaskCheckItem, dayType: DayType) => {
  if (dayType === "listening_focus") return isDictationTask(task);
  if (dayType === "reading_focus") return isReadingTask(task);
  if (dayType === "speaking_focus") return isSpeakingTask(task);
  if (dayType === "recovery") {
    return (
      isMomoTask(task) ||
      isDictationTask(task) ||
      isSpeakingTask(task)
    );
  }
  return false;
};

export function calculateColorStatus(record: Partial<DailyRecord>): DayStatus {
  const { tasks, dayType } = record;

  if (!tasks || tasks.length === 0 || !dayType) return "pending";

  const coreTasks = tasks.filter((t) => t.isCore);

  if (coreTasks.length === 0) return "pending";

  // Check sleep control tasks from array, fallback to record properties
  const stoppedAfter2230Task = tasks.find(t => t.title.includes("22:30"));
  const stoppedAfter2230 = stoppedAfter2230Task 
    ? stoppedAfter2230Task.completed 
    : record.stoppedAfter2230;

  const noCompensatoryTask = tasks.find(t => t.title.includes("没有补偿性熬夜"));
  const noCompensatoryStayingUp = noCompensatoryTask 
    ? noCompensatoryTask.completed 
    : record.noCompensatoryStayingUp;

  const wrapUpTask = tasks.find(isWrapUpTask);
  const wrapUpCompleted = wrapUpTask ? wrapUpTask.completed : true;

  // Metrics extraction
  const momoTasks = tasks.filter(isMomoTask);
  const mainTasks = tasks.filter((t) => isMainTaskForDay(t, dayType));
  const speakingTasks = tasks.filter(isSpeakingTask);

  const momoMinutes =
    momoTasks.reduce((acc, t) => acc + t.actualMinutes, 0) +
    (record.workdayBonus?.momoMinutes || 0);
  const mainMinutes = mainTasks.reduce((acc, t) => acc + t.actualMinutes, 0);
  const speakingMinutes = speakingTasks.reduce(
    (acc, t) => acc + t.actualMinutes,
    0,
  );

  const eveningFormalMinutes = momoMinutes + mainMinutes + speakingMinutes;

  const anyCoreCompleted = coreTasks.some((t) => t.completed);

  // Rule: Red
  if (
    !noCompensatoryStayingUp ||
    eveningFormalMinutes === 0 ||
    !anyCoreCompleted
  ) {
    return "red";
  }

  // Rule: Green
  const allCoreCompleted = coreTasks.every((t) => t.completed);
  if (allCoreCompleted && stoppedAfter2230 !== false && noCompensatoryStayingUp && wrapUpCompleted) {
    return "green";
  }

  // Rule: Yellow
  if (momoMinutes >= 20 && mainMinutes >= 30 && speakingMinutes >= 10 && noCompensatoryStayingUp) {
    return "yellow";
  }

  // Fallback to red if yellow minimums are not met either, and it's not green.
  return "red";
}

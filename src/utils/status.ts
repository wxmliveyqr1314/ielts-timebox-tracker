import { DailyRecord, DayStatus } from "../types";

export function calculateColorStatus(record: Partial<DailyRecord>): DayStatus {
  const { tasks } = record;

  if (!tasks || tasks.length === 0) return "pending";

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

  // Metrics extraction
  // Here we just look at the categories or assume `title` indicates what they are?
  // We added `category` to TaskCheckItem: 'momo', 'dictation', 'reading', 'speaking', 'passive_listening', 'wrap_up', etc.

  const momoTasks = tasks.filter((t) => t.category === "momo");
  const mainTasks = tasks.filter(
    (t) =>
      ["dictation", "reading", "speaking"].includes(t.category) && t.isCore,
  );
  const speakingTasks = tasks.filter((t) => t.category === "speaking");

  const momoMinutes =
    momoTasks.reduce((acc, t) => acc + t.actualMinutes, 0) +
    (record.workdayBonus?.momoMinutes || 0);
  const mainMinutes = mainTasks.reduce((acc, t) => acc + t.actualMinutes, 0);
  const speakingMinutes = speakingTasks.reduce(
    (acc, t) => acc + t.actualMinutes,
    0,
  );

  const eveningFormalMinutes = momoMinutes + mainMinutes + speakingMinutes;

  // Rule: Red
  // - Evening formal study is 0
  // - Or compensatory staying up (noCompensatoryStayingUp === false)
  // - Or NO core timeboxes completed.
  const anyCoreCompleted = coreTasks.some((t) => t.completed);

  if (
    !noCompensatoryStayingUp ||
    eveningFormalMinutes === 0 ||
    !anyCoreCompleted
  ) {
    return "red";
  }

  // Rule: Green
  // - All core tasks completed
  // - stoppedAfter2230 is true
  // - noCompensatoryStayingUp is true
  const allCoreCompleted = coreTasks.every((t) => t.completed);
  if (allCoreCompleted && stoppedAfter2230 !== false) {
    return "green";
  }

  // Rule: Yellow
  // - Momo >= 20 mins
  // - Main Task >= 30 mins
  // - Speaking >= 10 mins
  // - No compensatory late sleep (noCompensatoryStayingUp === true) -- already handled by Red
  if (momoMinutes >= 20 && mainMinutes >= 30 && speakingMinutes >= 10) {
    return "yellow";
  }

  // Fallback to red if yellow minimums are not met either, and it's not green.
  return "red";
}

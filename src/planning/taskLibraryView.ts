import type {
  CapacityKind,
  CreditGroup,
  StatusRole,
} from "../types";
import type { TaskDefinition } from "./taskRegistry";

export interface TaskLibraryGroup {
  id: string;
  title: string;
  description: string;
  tasks: Readonly<TaskDefinition>[];
}

type TaskLibraryGroupDefinition = Omit<TaskLibraryGroup, "tasks">;

const GROUP_DEFINITIONS: readonly TaskLibraryGroupDefinition[] = [
  {
    id: "vocabulary",
    title: "词汇",
    description: "通过词汇记忆与复习，为各项英语能力打好基础。",
  },
  {
    id: "listening",
    title: "听力",
    description: "听写、听力复习与泛听参考任务。",
  },
  {
    id: "reading",
    title: "阅读",
    description: "文章速览、长难句分析与同义替换笔记。",
  },
  {
    id: "speaking",
    title: "口语",
    description: "跟读、AI 对话、纠错与重录练习。",
  },
  {
    id: "review-planning",
    title: "复习与计划",
    description: "轻量复习，并安排明天的第一步。",
  },
  {
    id: "sleep-protection",
    title: "睡眠保护",
    description: "通过收尾检查保护睡眠，留住明天的精力。",
  },
  {
    id: "other",
    title: "其他",
    description: "尚未归类的学习任务。",
  },
] as const;

function getTaskLibraryGroupId(task: Readonly<TaskDefinition>): string {
  if (task.category === "sleep_control" || task.skill === "sleep") {
    return "sleep-protection";
  }

  if (
    task.category === "wrap_up" ||
    task.skill === "planning" ||
    task.skill === "review"
  ) {
    return "review-planning";
  }

  if (task.category === "momo" || task.skill === "vocabulary") {
    return "vocabulary";
  }

  if (
    task.skill === "listening" ||
    task.category === "passive_listening" ||
    task.category.startsWith("dictation")
  ) {
    return "listening";
  }

  if (task.skill === "reading" || task.category.startsWith("reading")) {
    return "reading";
  }

  if (task.skill === "speaking" || task.category.startsWith("speaking")) {
    return "speaking";
  }

  return "other";
}

export function buildTaskLibraryGroups(
  registry: Readonly<Record<string, Readonly<TaskDefinition>>>,
): TaskLibraryGroup[] {
  const groupedTasks = new Map<string, Readonly<TaskDefinition>[]>();

  for (const task of Object.values(registry)) {
    const groupId = getTaskLibraryGroupId(task);
    const current = groupedTasks.get(groupId) ?? [];
    groupedTasks.set(groupId, [...current, task]);
  }

  return GROUP_DEFINITIONS.flatMap((group) => {
    const tasks = groupedTasks.get(group.id) ?? [];
    return tasks.length > 0 ? [{ ...group, tasks }] : [];
  });
}

export function formatTaskLibraryBadge(
  type: "status",
  value: StatusRole,
): string;
export function formatTaskLibraryBadge(
  type: "capacity",
  value: CapacityKind,
): string;
export function formatTaskLibraryBadge(type: "reward", value: boolean): string;
export function formatTaskLibraryBadge(type: "formal", value: boolean): string;
export function formatTaskLibraryBadge(
  type: "credit",
  value: CreditGroup,
): string;
export function formatTaskLibraryBadge(
  type: "status" | "capacity" | "reward" | "formal" | "credit",
  value: StatusRole | CapacityKind | CreditGroup | boolean,
): string {
  if (type === "reward") {
    return value ? "可计分" : "不计分";
  }

  if (type === "formal") {
    return value ? "正式学习" : "辅助任务";
  }

  if (type === "credit") {
    const groups: Record<string, string> = { momo: "词汇", dictation: "听写", reading: "阅读", speaking: "口语", passive_listening: "泛听" };
    return `${groups[String(value)] ?? "同类学习"}可抵扣`;
  }

  const labels: Record<string, string> = { required: "必做", optional: "可选", ignored: "不影响状态", control: "收尾检查", focused: "专注学习", parallel: "可并行", anchor: "收尾任务", stretch: "可选加练" };
  return labels[String(value)] ?? "其他";
}

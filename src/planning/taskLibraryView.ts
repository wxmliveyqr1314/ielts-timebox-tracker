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
    title: "Vocabulary",
    description: "Vocabulary memory and review tasks that support all skills.",
  },
  {
    id: "listening",
    title: "Listening",
    description: "Dictation, listening review, and passive listening reference.",
  },
  {
    id: "reading",
    title: "Reading",
    description: "Passage scanning, sentence analysis, and paraphrase notes.",
  },
  {
    id: "speaking",
    title: "Speaking",
    description: "Shadowing, AI conversation, correction, and retake practice.",
  },
  {
    id: "review-planning",
    title: "Review and Planning",
    description: "Light review blocks and tomorrow-first-step planning.",
  },
  {
    id: "sleep-protection",
    title: "Sleep Protection",
    description: "Control checks that protect recovery and next-day capacity.",
  },
  {
    id: "other",
    title: "Other",
    description: "Future or uncategorized study tasks.",
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
    return value ? "Reward" : "No reward";
  }

  if (type === "formal") {
    return value ? "Formal" : "Support";
  }

  if (type === "credit") {
    return `${capitalizeWords(String(value).replace(/_/g, " "))} credit`;
  }

  return capitalizeWords(String(value).replace(/_/g, " "));
}

function capitalizeWords(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

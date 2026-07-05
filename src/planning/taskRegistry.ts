import type {
  CapacityKind,
  CreditGroup,
  StatusRole,
  TaskCategory,
} from "../types";

export interface TaskDefinition {
  id: string;
  title: string;
  category: TaskCategory;
  creditGroup?: CreditGroup;
  capacityKind: CapacityKind;
  statusRole: StatusRole;
  minMinutes: number;
  incrementMinutes: number;
}

function defineTask(definition: TaskDefinition): Readonly<TaskDefinition> {
  return Object.freeze(definition);
}

export const TASK_REGISTRY: Readonly<Record<string, Readonly<TaskDefinition>>> =
  Object.freeze({
    momo: defineTask({
      id: "momo",
      title: "Momo vocabulary",
      category: "momo",
      creditGroup: "momo",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 10,
      incrementMinutes: 5,
    }),
    "dictation-review": defineTask({
      id: "dictation-review",
      title: "Dictation error review",
      category: "dictation_review",
      creditGroup: "dictation",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 10,
      incrementMinutes: 5,
    }),
    "dictation-new": defineTask({
      id: "dictation-new",
      title: "New dictation unit",
      category: "dictation_new",
      creditGroup: "dictation",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 10,
      incrementMinutes: 5,
    }),
    "dictation-error-check": defineTask({
      id: "dictation-error-check",
      title: "Dictation error check",
      category: "dictation_error_check",
      creditGroup: "dictation",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
    }),
    "dictation-stretch": defineTask({
      id: "dictation-stretch",
      title: "Additional dictation practice",
      category: "dictation_new",
      creditGroup: "dictation",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
    }),
    "reading-scan": defineTask({
      id: "reading-scan",
      title: "Reading passage scan",
      category: "reading_scan",
      creditGroup: "reading",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
    }),
    "reading-analysis": defineTask({
      id: "reading-analysis",
      title: "Long sentence analysis",
      category: "reading_sentence_analysis",
      creditGroup: "reading",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 10,
      incrementMinutes: 5,
    }),
    "reading-notes": defineTask({
      id: "reading-notes",
      title: "Synonym and vocabulary notes",
      category: "reading_synonym_notes",
      creditGroup: "reading",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
    }),
    "reading-stretch": defineTask({
      id: "reading-stretch",
      title: "Additional timed reading",
      category: "reading_scan",
      creditGroup: "reading",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
    }),
    "speaking-shadowing": defineTask({
      id: "speaking-shadowing",
      title: "Speaking shadowing",
      category: "speaking_shadowing",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
    }),
    "speaking-conversation": defineTask({
      id: "speaking-conversation",
      title: "AI speaking conversation",
      category: "speaking_ai_conversation",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 10,
      incrementMinutes: 5,
    }),
    "speaking-retake": defineTask({
      id: "speaking-retake",
      title: "Correction and retake",
      category: "speaking_correction_retake",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
    }),
    "speaking-stretch": defineTask({
      id: "speaking-stretch",
      title: "Additional speaking simulation",
      category: "speaking_ai_conversation",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
    }),
    "mixed-review": defineTask({
      id: "mixed-review",
      title: "Dictation or light reading review",
      category: "other",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
    }),
    "wrap-up": defineTask({
      id: "wrap-up",
      title: "Record results and tomorrow's first step",
      category: "wrap_up",
      capacityKind: "anchor",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
    }),
    "passive-listening": defineTask({
      id: "passive-listening",
      title: "Passive listening reference",
      category: "passive_listening",
      creditGroup: "passive_listening",
      capacityKind: "parallel",
      statusRole: "ignored",
      minMinutes: 0,
      incrementMinutes: 5,
    }),
    "sleep-stop-heavy": defineTask({
      id: "sleep-stop-heavy",
      title: "No new heavy task after 22:30",
      category: "sleep_control",
      capacityKind: "control",
      statusRole: "control",
      minMinutes: 0,
      incrementMinutes: 0,
    }),
    "sleep-no-compensation": defineTask({
      id: "sleep-no-compensation",
      title: "No compensatory staying up",
      category: "sleep_control",
      capacityKind: "control",
      statusRole: "control",
      minMinutes: 0,
      incrementMinutes: 0,
    }),
  });

export function getTaskDefinition(id: string): Readonly<TaskDefinition> {
  const definition = TASK_REGISTRY[id];
  if (!definition) {
    throw new Error(`Unknown task definition: ${id}`);
  }
  return definition;
}

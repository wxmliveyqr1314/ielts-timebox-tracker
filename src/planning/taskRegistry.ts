import type {
  CapacityKind,
  CreditGroup,
  IeltsSkill,
  StatusRole,
  TaskCategory,
} from "../types";

export interface TaskDefinition {
  id: string;
  title: string;
  category: TaskCategory;
  skill?: IeltsSkill;
  description?: string;
  instruction?: string;
  doneCriteria?: string;
  creditGroup?: CreditGroup;
  capacityKind: CapacityKind;
  statusRole: StatusRole;
  minMinutes: number;
  incrementMinutes: number;
  formalStudy?: boolean;
  rewardEligible?: boolean;
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
      skill: "vocabulary",
      description:
        "Complete today's Momo vocabulary review. Focus on accuracy, not speed.",
      instruction:
        "Review the assigned vocabulary and mark difficult words for future repetition.",
      doneCriteria:
        "Complete the planned minutes or today's assigned Momo review unit.",
      creditGroup: "momo",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 10,
      incrementMinutes: 5,
      formalStudy: true,
      rewardEligible: true,
    }),
    "dictation-review": defineTask({
      id: "dictation-review",
      title: "Dictation error review",
      category: "dictation_review",
      skill: "listening",
      description:
        "Replay previous dictation mistakes and correct unclear sounds or spelling errors.",
      instruction:
        "Replay the missed audio, compare it with the correct text, and note repeated sound or spelling problems.",
      doneCriteria:
        "Review at least five error items or complete the planned review minutes.",
      creditGroup: "dictation",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 10,
      incrementMinutes: 5,
      formalStudy: true,
      rewardEligible: true,
    }),
    "dictation-new": defineTask({
      id: "dictation-new",
      title: "New dictation unit",
      category: "dictation_new",
      skill: "listening",
      description:
        "Complete one new short dictation unit, then check and mark errors.",
      instruction:
        "Listen, write what you hear, check against the source, and mark unclear words or sentences.",
      doneCriteria:
        "Complete one assigned dictation segment or the planned minutes.",
      creditGroup: "dictation",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 10,
      incrementMinutes: 5,
      formalStudy: true,
      rewardEligible: true,
    }),
    "dictation-error-check": defineTask({
      id: "dictation-error-check",
      title: "Dictation error check",
      category: "dictation_error_check",
      skill: "listening",
      description:
        "Quickly verify recent dictation mistakes and repeat only the missed parts.",
      instruction:
        "Scan recent errors, replay only the weak sections, and confirm whether the same mistake still appears.",
      doneCriteria:
        "Finish the error checklist or complete the planned minutes.",
      creditGroup: "dictation",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
      formalStudy: true,
      rewardEligible: true,
    }),
    "dictation-stretch": defineTask({
      id: "dictation-stretch",
      title: "Additional dictation practice",
      category: "dictation_new",
      skill: "listening",
      description:
        "Continue with one extra dictation segment if the baseline already feels stable.",
      instruction:
        "Use this as bonus practice after the required dictation work is under control.",
      doneCriteria:
        "Complete one extra short segment or the planned stretch minutes.",
      creditGroup: "dictation",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
      formalStudy: true,
      rewardEligible: true,
    }),
    "reading-scan": defineTask({
      id: "reading-scan",
      title: "Reading passage scan",
      category: "reading_scan",
      skill: "reading",
      description:
        "Skim one passage and locate key information under time pressure.",
      instruction:
        "Scan headings, topic sentences, names, numbers, and signal words before checking question locations.",
      doneCriteria:
        "Finish one passage scan or complete the planned minutes.",
      creditGroup: "reading",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
      formalStudy: true,
      rewardEligible: true,
    }),
    "reading-analysis": defineTask({
      id: "reading-analysis",
      title: "Long sentence analysis",
      category: "reading_sentence_analysis",
      skill: "reading",
      description:
        "Break down 3-5 difficult sentences and identify grammar structure.",
      instruction:
        "Select complex IELTS reading sentences, find the main structure, and mark clauses, grammar links, and key vocabulary.",
      doneCriteria:
        "Complete at least three long-sentence breakdowns or the planned minutes.",
      creditGroup: "reading",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 10,
      incrementMinutes: 5,
      formalStudy: true,
      rewardEligible: true,
    }),
    "reading-notes": defineTask({
      id: "reading-notes",
      title: "Synonym and vocabulary notes",
      category: "reading_synonym_notes",
      skill: "reading",
      description:
        "Record IELTS reading paraphrases, synonyms, and useful expressions.",
      instruction:
        "Collect useful paraphrases and vocabulary from reading passages, mistakes, or sentence analysis.",
      doneCriteria:
        "Record at least five useful items or complete the planned minutes.",
      creditGroup: "reading",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
      formalStudy: true,
      rewardEligible: true,
    }),
    "reading-stretch": defineTask({
      id: "reading-stretch",
      title: "Additional timed reading",
      category: "reading_scan",
      skill: "reading",
      description:
        "Do one extra timed reading block without affecting today's baseline status.",
      instruction:
        "Use this as bonus reading practice after the required reading work is stable.",
      doneCriteria:
        "Complete one extra timed block or the planned stretch minutes.",
      creditGroup: "reading",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
      formalStudy: true,
      rewardEligible: true,
    }),
    "speaking-shadowing": defineTask({
      id: "speaking-shadowing",
      title: "Speaking shadowing",
      category: "speaking_shadowing",
      skill: "speaking",
      description:
        "Shadow one short audio clip and imitate pronunciation, rhythm, and pauses.",
      instruction:
        "Listen to a short clip, repeat aloud, and imitate stress, rhythm, pauses, and pronunciation.",
      doneCriteria:
        "Complete one short shadowing set or the planned minutes.",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
      formalStudy: true,
      rewardEligible: true,
    }),
    "speaking-conversation": defineTask({
      id: "speaking-conversation",
      title: "AI speaking conversation",
      category: "speaking_ai_conversation",
      skill: "speaking",
      description:
        "Complete one focused AI speaking round. Prioritize fluency over perfection.",
      instruction:
        "Answer IELTS-style prompts aloud and keep the conversation moving before polishing details.",
      doneCriteria:
        "Complete one focused speaking round or the planned minutes.",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 10,
      incrementMinutes: 5,
      formalStudy: true,
      rewardEligible: true,
    }),
    "speaking-retake": defineTask({
      id: "speaking-retake",
      title: "Correction and retake",
      category: "speaking_correction_retake",
      skill: "speaking",
      description:
        "Choose 1-2 weak answers, correct them, and say them again.",
      instruction:
        "Review weak speaking answers, improve the wording or structure, then retake them aloud.",
      doneCriteria:
        "Complete at least one corrected retake or the planned minutes.",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
      formalStudy: true,
      rewardEligible: true,
    }),
    "speaking-stretch": defineTask({
      id: "speaking-stretch",
      title: "Additional speaking simulation",
      category: "speaking_ai_conversation",
      skill: "speaking",
      description:
        "Add one extra IELTS-style speaking round only if the baseline is already complete.",
      instruction:
        "Use this as optional speaking practice after the required speaking tasks are done.",
      doneCriteria:
        "Complete one extra speaking round or the planned stretch minutes.",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
      formalStudy: true,
      rewardEligible: true,
    }),
    "mixed-review": defineTask({
      id: "mixed-review",
      title: "Dictation or light reading review",
      category: "other",
      skill: "review",
      description:
        "Complete a light review of either dictation mistakes or reading notes.",
      instruction:
        "Pick the weaker area today, then review a small set of recent mistakes or notes.",
      doneCriteria:
        "Complete one light review block or the planned minutes.",
      capacityKind: "focused",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
      formalStudy: true,
      rewardEligible: true,
    }),
    "wrap-up": defineTask({
      id: "wrap-up",
      title: "Record results and tomorrow's first step",
      category: "wrap_up",
      skill: "planning",
      description: "Record today's result and write tomorrow's first step.",
      instruction:
        "Summarize what happened today and write one concrete first action for tomorrow.",
      doneCriteria:
        "Fill in tomorrow's first step and any important notes from today.",
      capacityKind: "anchor",
      statusRole: "required",
      minMinutes: 5,
      incrementMinutes: 5,
      formalStudy: false,
      rewardEligible: false,
    }),
    "passive-listening": defineTask({
      id: "passive-listening",
      title: "Passive listening reference",
      category: "passive_listening",
      skill: "listening",
      description:
        "Log passive listening as a reference habit. It should not reduce focused tasks.",
      instruction:
        "Use this for background listening or broad exposure, not focused IELTS task replacement.",
      doneCriteria:
        "Record the listening reference time honestly if it happened.",
      creditGroup: "passive_listening",
      capacityKind: "parallel",
      statusRole: "ignored",
      minMinutes: 0,
      incrementMinutes: 5,
      formalStudy: false,
      rewardEligible: false,
    }),
    "sleep-stop-heavy": defineTask({
      id: "sleep-stop-heavy",
      title: "No new heavy task after 22:30",
      category: "sleep_control",
      skill: "sleep",
      description: "Confirm that no new heavy study task was started after 22:30.",
      instruction:
        "Use this as a sleep-protection check, not as a study task.",
      doneCriteria:
        "Mark complete only if you avoided starting new heavy work after 22:30.",
      capacityKind: "control",
      statusRole: "control",
      minMinutes: 0,
      incrementMinutes: 0,
      formalStudy: false,
      rewardEligible: false,
    }),
    "sleep-no-compensation": defineTask({
      id: "sleep-no-compensation",
      title: "No compensatory staying up",
      category: "sleep_control",
      skill: "sleep",
      description: "Confirm that unfinished work was not paid back by staying up late.",
      instruction:
        "Protect tomorrow's capacity by stopping instead of compensating with late-night study.",
      doneCriteria:
        "Mark complete only if you did not stay up to compensate for unfinished work.",
      capacityKind: "control",
      statusRole: "control",
      minMinutes: 0,
      incrementMinutes: 0,
      formalStudy: false,
      rewardEligible: false,
    }),
  });

export function getTaskDefinition(id: string): Readonly<TaskDefinition> {
  const definition = TASK_REGISTRY[id];
  if (!definition) {
    throw new Error(`Unknown task definition: ${id}`);
  }
  return definition;
}

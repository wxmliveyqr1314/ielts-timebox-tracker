export type DayType =
  | "listening_focus"
  | "reading_focus"
  | "speaking_focus"
  | "recovery";

export type EnergyLevel = "low" | "normal" | "high";

export type DayStatus = "green" | "yellow" | "red" | "pending";

export type TaskCategory =
  | "passive_listening"
  | "momo"
  | "dictation"
  | "reading"
  | "speaking"
  | "dictation_review"
  | "dictation_new"
  | "dictation_error_check"
  | "reading_scan"
  | "reading_sentence_analysis"
  | "reading_synonym_notes"
  | "speaking_shadowing"
  | "speaking_ai_conversation"
  | "speaking_correction_retake"
  | "wrap_up"
  | "sleep_control"
  | "other";

export interface WorkdayBonus {
  passiveListeningMinutes: number;
  momoMinutes?: number;
  dictationMinutes?: number;
  readingMinutes?: number;
}

export interface TaskCheckItem {
  id: string;
  title: string;
  category: TaskCategory;
  plannedMinutes: number;
  actualMinutes: number;
  completed: boolean;
  isCore: boolean;
  isEveningTask: boolean;
  canBeReducedByWorkdayBonus?: boolean;
  notes?: string;
}

export interface DailyPlanOptions {
  exercised: boolean;
  energyLevel: EnergyLevel;
  dayType: DayType;
  workdayBonus?: WorkdayBonus;
  yesterdayStatus?: DayStatus;
}

export interface DailyRecord {
  date: string;
  weekday: string;

  exercised: boolean;
  startTime: "18:00" | "19:00";
  energyLevel: EnergyLevel;
  dayType: DayType;

  workdayBonus: WorkdayBonus;

  tasks: TaskCheckItem[];

  stoppedAfter2230: boolean;
  noCompensatoryStayingUp: boolean;
  bedtime?: string;

  tomorrowFirstStep: string;
  notes?: string;

  status: DayStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  momoDefaultMinutes: number;
  listeningFocusMinutes: number;
  readingFocusMinutes: number;
  speakingDefaultMinutes: number;
  recoveryMomoMinutes: number;
  recoveryDictationMinutes: number;
  recoverySpeakingMinutes: number;
  wrapUpMinutes: number;
  stopNewTaskTime: string;
}

export interface AppState {
  records: Record<string, DailyRecord>;
  settings?: AppSettings;
  sync?: {
    schemaVersion: 1;
    deviceId: string;
    deletedRecords?: Record<string, string>;
    lastSyncAt?: string;
  };
}

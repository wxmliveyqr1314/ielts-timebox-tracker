export type DayType =
  | "listening_focus"
  | "reading_focus"
  | "speaking_focus"
  | "recovery";

export type EnergyLevel = "low" | "normal" | "high";

export type DayContext = "workday" | "rest_day";

export type StretchStrategy = "same_focus" | "balanced";

export type PlanRole = "baseline" | "stretch" | "carried" | "control";

export type CreditGroup =
  | "momo"
  | "dictation"
  | "reading"
  | "passive_listening";

export type CapacityKind =
  | "focused"
  | "parallel"
  | "anchor"
  | "control"
  | "stretch";

export type StatusRole = "required" | "optional" | "ignored" | "control";

export type PlanEngineVersion = 1 | 2;

export type PlanAdjustmentCode =
  | "low_energy"
  | "high_energy"
  | "workout_start"
  | "workday_credit"
  | "rest_day"
  | "manual_capacity"
  | "capacity_trimmed"
  | "passive_reference_met"
  | "recovery_no_increase"
  | "stretch_enabled";

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

export interface DailyPlanInput {
  exercised: boolean;
  energyLevel: EnergyLevel;
  dayType: DayType;
  dayContext: DayContext;
  workdayBonus: WorkdayBonus;
  availableFocusedMinutes?: number;
  stretchEnabled?: boolean;
  stretchStrategy?: StretchStrategy;
}

export interface PlanCredit {
  group: CreditGroup;
  enteredMinutes: number;
  appliedMinutes: number;
  extraMinutes: number;
}

export interface PlanSummary {
  standardCoreMinutes: number;
  energyAdjustedCoreMinutes: number;
  appliedCoreCreditMinutes: number;
  extraCompletedMinutes: number;
  capacityMinutes: number;
  capacityTrimmedMinutes: number;
  eveningCoreTargetMinutes: number;
  passiveReferenceMinutes: number;
  passiveReferenceRemainingMinutes: number;
}

export interface DailyPlanStretchSummary {
  enabled: boolean;
  strategy?: StretchStrategy;
  budgetMinutes: number;
  plannedMinutes: number;
}

export interface DailyPlanSnapshot {
  engineVersion: PlanEngineVersion;
  generatedAt: string;
  input: DailyPlanInput;
  credits: PlanCredit[];
  summary: PlanSummary;
  adjustmentCodes: PlanAdjustmentCode[];
  stretch?: DailyPlanStretchSummary;
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
  definitionId?: string;
  entryId?: string;
  creditGroup?: CreditGroup;
  capacityKind?: CapacityKind;
  statusRole?: StatusRole;
  carriedForward?: boolean;
  planRole?: PlanRole;
  stretchStrategy?: StretchStrategy;
}

export interface DailyPlanResult {
  tasks: TaskCheckItem[];
  snapshot: Omit<DailyPlanSnapshot, "generatedAt">;
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
  startTime: "17:00" | "18:00" | "19:00";
  energyLevel: EnergyLevel;
  dayType: DayType;
  dayContext?: DayContext;
  availableFocusedMinutes?: number;

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
  planSnapshot?: DailyPlanSnapshot;
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
    lastSyncResult?: {
      uploaded: number;
      downloaded: number;
      skipped: number;
      completedAt: string;
    };
  };
}

export type DataHealthIssueSeverity = "warning" | "error";

export interface DataHealthIssue {
  severity: DataHealthIssueSeverity;
  code: string;
  message: string;
  date?: string;
}

export interface DataHealthReport {
  ok: boolean;
  totalRecords: number;
  errors: number;
  warnings: number;
  issues: DataHealthIssue[];
}

import { AppState, DataHealthReport, DataHealthIssue, DataHealthIssueSeverity } from "../types";
import { normalizeDateString } from "./date";

const PLAN_SUMMARY_FIELDS = [
  "standardCoreMinutes",
  "energyAdjustedCoreMinutes",
  "appliedCoreCreditMinutes",
  "extraCompletedMinutes",
  "capacityMinutes",
  "capacityTrimmedMinutes",
  "eveningCoreTargetMinutes",
  "passiveReferenceMinutes",
  "passiveReferenceRemainingMinutes",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function normalizeBonus(value: unknown) {
  const bonus = isObject(value) ? value : {};
  return {
    passiveListeningMinutes: bonus.passiveListeningMinutes ?? 0,
    momoMinutes: bonus.momoMinutes ?? 0,
    dictationMinutes: bonus.dictationMinutes ?? 0,
    readingMinutes: bonus.readingMinutes ?? 0,
  };
}

function planInputsMatch(record: Record<string, any>, input: any): boolean {
  return (
    input.dayContext === (record.dayContext ?? "workday") &&
    input.exercised === record.exercised &&
    input.energyLevel === record.energyLevel &&
    input.dayType === record.dayType &&
    input.availableFocusedMinutes === record.availableFocusedMinutes &&
    JSON.stringify(normalizeBonus(input.workdayBonus)) === JSON.stringify(normalizeBonus(record.workdayBonus))
  );
}

export function analyzeAppDataHealth(appData: AppState): DataHealthReport {
  const issues: DataHealthIssue[] = [];
  let errors = 0;
  let warnings = 0;

  const addIssue = (severity: DataHealthIssueSeverity, code: string, message: string, date?: string) => {
    issues.push({ severity, code, message, date });
    if (severity === "error") errors++;
    if (severity === "warning") warnings++;
  };

  if (!appData || typeof appData !== "object") {
    addIssue("error", "APP_DATA_NOT_OBJECT", "appData is not a valid object");
    return { ok: false, totalRecords: 0, errors, warnings, issues };
  }

  const records = appData.records;
  if (!records || typeof records !== "object") {
    addIssue("error", "RECORDS_NOT_OBJECT", "appData.records is not a valid object");
    return { ok: false, totalRecords: 0, errors, warnings, issues };
  }

  const recordKeys = Object.keys(records);
  const normalizedKeyMap = new Map<string, string[]>();

  recordKeys.forEach((key) => {
    const record = records[key];
    const normalizedKey = normalizeDateString(key);

    if (!normalizedKey) {
      addIssue("error", "INVALID_RECORD_KEY", `Record key '${key}' is not a valid date format`, key);
    } else {
      if (normalizedKey !== key) {
        addIssue("warning", "KEY_NOT_NORMALIZED", `Record key '${key}' should be normalized to '${normalizedKey}'`, key);
      }

      const existing = normalizedKeyMap.get(normalizedKey) || [];
      existing.push(key);
      normalizedKeyMap.set(normalizedKey, existing);
    }

    if (!record || typeof record !== "object") {
      addIssue("error", "RECORD_NOT_OBJECT", `Record for key '${key}' is not an object`, key);
      return;
    }

    if (typeof record.date !== "string") {
      addIssue("error", "INVALID_RECORD_DATE", `Record date is missing or not a string`, key);
    } else if (record.date !== key) {
      if (normalizeDateString(record.date) !== normalizeDateString(key)) {
        addIssue("error", "DATE_KEY_MISMATCH", `Record date '${record.date}' does not match key '${key}'`, key);
      }
    }

    if (!record.createdAt || Number.isNaN(Date.parse(record.createdAt))) {
      addIssue("warning", "INVALID_CREATED_AT", `createdAt is missing or invalid`, key);
    }

    if (!record.updatedAt || Number.isNaN(Date.parse(record.updatedAt))) {
      addIssue("warning", "INVALID_UPDATED_AT", `updatedAt is missing or invalid`, key);
    }

    if (!["green", "yellow", "red", "pending"].includes(record.status)) {
      addIssue("error", "INVALID_STATUS", `Unknown status '${record.status}'`, key);
    }

    const validDayTypes = ["listening_focus", "reading_focus", "speaking_focus", "recovery"];
    if (!validDayTypes.includes(record.dayType)) {
      addIssue("error", "INVALID_DAY_TYPE", `Unknown dayType '${record.dayType}'`, key);
    }

    if (!Array.isArray(record.tasks)) {
      addIssue("error", "TASKS_NOT_ARRAY", `tasks is not an array`, key);
    } else {
      record.tasks.forEach((task: any, index: number) => {
        if (!task.id || !task.title || !task.category) {
          addIssue("error", "TASK_MISSING_FIELDS", `Task at index ${index} is missing id, title, or category`, key);
        }
        if (typeof task.actualMinutes !== "number" || task.actualMinutes < 0 || Number.isNaN(task.actualMinutes)) {
          addIssue("error", "TASK_INVALID_ACTUAL_MINUTES", `Task '${task.title || index}' has invalid actualMinutes`, key);
        }
        if (typeof task.plannedMinutes !== "number" || task.plannedMinutes < 0 || Number.isNaN(task.plannedMinutes)) {
          addIssue("error", "TASK_INVALID_PLANNED_MINUTES", `Task '${task.title || index}' has invalid plannedMinutes`, key);
        }
      });
    }

    if (record.planSnapshot !== undefined) {
      const snapshot = record.planSnapshot;
      const structurallyValid =
        isObject(snapshot) &&
        typeof snapshot.engineVersion === "number" &&
        typeof snapshot.generatedAt === "string" &&
        !Number.isNaN(Date.parse(snapshot.generatedAt)) &&
        isObject(snapshot.input) &&
        Array.isArray(snapshot.credits) &&
        isObject(snapshot.summary) &&
        Array.isArray(snapshot.adjustmentCodes);

      if (!structurallyValid) {
        addIssue(
          "error",
          "PLAN_SNAPSHOT_MISSING_FIELDS",
          "Plan snapshot is missing required fields or contains an invalid generatedAt value",
          key,
        );
      } else {
        if (snapshot.engineVersion !== 1 && snapshot.engineVersion !== 2) {
          addIssue(
            "error",
            "INVALID_PLAN_ENGINE_VERSION",
            `Unsupported plan engine version '${String(snapshot.engineVersion)}'`,
            key,
          );
        }

        if (snapshot.stretch !== undefined) {
          const stretch: Record<string, unknown> = isObject(snapshot.stretch)
            ? snapshot.stretch
            : {};
          if (typeof stretch.enabled !== "boolean") {
            addIssue(
              "error",
              "PLAN_STRETCH_INVALID_ENABLED",
              "Plan stretch enabled flag is invalid",
              key,
            );
          }
          if (
            stretch.strategy !== undefined &&
            stretch.strategy !== "same_focus" &&
            stretch.strategy !== "balanced"
          ) {
            addIssue(
              "error",
              "PLAN_STRETCH_INVALID_STRATEGY",
              "Plan stretch strategy is invalid",
              key,
            );
          }
          if (
            typeof stretch.budgetMinutes !== "number" ||
            !Number.isFinite(stretch.budgetMinutes) ||
            stretch.budgetMinutes < 0
          ) {
            addIssue(
              "error",
              "PLAN_STRETCH_INVALID_BUDGET",
              "Plan stretch budget is invalid",
              key,
            );
          }
          if (
            typeof stretch.plannedMinutes !== "number" ||
            !Number.isFinite(stretch.plannedMinutes) ||
            stretch.plannedMinutes < 0
          ) {
            addIssue(
              "error",
              "PLAN_STRETCH_INVALID_PLANNED",
              "Plan stretch planned minutes is invalid",
              key,
            );
          }
        }

        const invalidSummary = PLAN_SUMMARY_FIELDS.some((field) => {
          const value = snapshot.summary[field];
          return typeof value !== "number" || !Number.isFinite(value) || value < 0;
        });
        if (invalidSummary) {
          addIssue(
            "error",
            "INVALID_PLAN_SUMMARY",
            "Plan snapshot summary contains a missing, negative, or non-finite value",
            key,
          );
        }

        if (!planInputsMatch(record, snapshot.input)) {
          addIssue(
            "warning",
            "PLAN_INPUT_MISMATCH",
            "Record planning inputs differ from the inputs saved with its generated plan",
            key,
          );
        }
      }
    }
  });

  normalizedKeyMap.forEach((keys, normalized) => {
    if (keys.length > 1) {
      addIssue("error", "DUPLICATE_NORMALIZED_KEYS", `Multiple keys normalize to '${normalized}': ${keys.join(", ")}`);
    }
  });

  const deletedRecords = appData.sync?.deletedRecords;
  if (deletedRecords && typeof deletedRecords === "object") {
    Object.keys(deletedRecords).forEach(delKey => {
      if (!normalizeDateString(delKey)) {
        addIssue("error", "INVALID_DELETED_RECORD_KEY", `Deleted record key '${delKey}' is not a valid date format`, delKey);
      }
    });
  }

  return {
    ok: errors === 0 && warnings === 0,
    totalRecords: recordKeys.length,
    errors,
    warnings,
    issues
  };
}

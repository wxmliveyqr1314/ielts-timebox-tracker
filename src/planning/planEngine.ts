import type {
  CreditGroup,
  DailyPlanInput,
  DailyPlanResult,
  DayContext,
  PlanAdjustmentCode,
  PlanCredit,
  TaskCheckItem,
  WorkdayBonus,
} from "../types";
import {
  getProfileVariant,
  type ProfileEntry,
} from "./focusProfiles";
import { getTaskDefinition } from "./taskRegistry";

const PASSIVE_REFERENCE_MINUTES = 60;
const CREDIT_GROUPS: readonly CreditGroup[] = [
  "passive_listening",
  "momo",
  "dictation",
  "reading",
];

interface WorkingEntry extends ProfileEntry {
  plannedMinutes: number;
}

function normalizeMinutes(value: unknown, maximum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(maximum, Math.max(0, Math.trunc(value)));
}

function normalizeBonus(bonus: WorkdayBonus): Required<WorkdayBonus> {
  return {
    passiveListeningMinutes: normalizeMinutes(
      bonus.passiveListeningMinutes,
      720,
    ),
    momoMinutes: normalizeMinutes(bonus.momoMinutes, 720),
    dictationMinutes: normalizeMinutes(bonus.dictationMinutes, 720),
    readingMinutes: normalizeMinutes(bonus.readingMinutes, 720),
  };
}

function getEnteredMinutes(
  bonus: Required<WorkdayBonus>,
  group: CreditGroup,
): number {
  if (group === "passive_listening") return bonus.passiveListeningMinutes;
  if (group === "momo") return bonus.momoMinutes;
  if (group === "dictation") return bonus.dictationMinutes;
  return bonus.readingMinutes;
}

function sumEntries(entries: WorkingEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.plannedMinutes, 0);
}

function sumGroup(entries: WorkingEntry[], group: CreditGroup): number {
  return entries.reduce((sum, entry) => {
    const definition = getTaskDefinition(entry.definitionId);
    return definition.creditGroup === group ? sum + entry.plannedMinutes : sum;
  }, 0);
}

function getRoundedReduction(
  entry: WorkingEntry,
  requiredReduction: number,
  maximumReduction: number,
): number {
  const increment = getTaskDefinition(entry.definitionId).incrementMinutes || 1;
  const rounded = Math.ceil(requiredReduction / increment) * increment;
  return Math.min(maximumReduction, rounded);
}

function getCapacityAllocation(
  entry: WorkingEntry,
  availableMinutes: number,
): number {
  const increment = getTaskDefinition(entry.definitionId).incrementMinutes || 1;
  const roundedCapacity = Math.floor(availableMinutes / increment) * increment;
  return Math.min(entry.plannedMinutes, roundedCapacity);
}

function applyCredit(
  entries: WorkingEntry[],
  group: CreditGroup,
  enteredMinutes: number,
): PlanCredit {
  const targetMinutes =
    group === "passive_listening"
      ? PASSIVE_REFERENCE_MINUTES
      : sumGroup(entries, group);
  const appliedMinutes = Math.min(enteredMinutes, targetMinutes);
  let remainingCredit = appliedMinutes;

  if (group !== "passive_listening" && remainingCredit > 0) {
    const candidates = entries
      .filter(
        (entry) => getTaskDefinition(entry.definitionId).creditGroup === group,
      )
      .sort(
        (left, right) =>
          (left.creditOrder ?? Number.MAX_SAFE_INTEGER) -
            (right.creditOrder ?? Number.MAX_SAFE_INTEGER) ||
          right.priority - left.priority,
      );

    for (const entry of candidates) {
      const reduction = Math.min(entry.plannedMinutes, remainingCredit);
      entry.plannedMinutes -= reduction;
      remainingCredit -= reduction;
      if (remainingCredit === 0) break;
    }
  }

  return {
    group,
    enteredMinutes,
    appliedMinutes,
    extraMinutes: enteredMinutes - appliedMinutes,
  };
}

function trimEntriesToCapacity(
  sourceEntries: WorkingEntry[],
  capacityMinutes: number,
): WorkingEntry[] {
  const entries = sourceEntries.map((entry) => ({ ...entry }));
  let excess = Math.max(0, sumEntries(entries) - capacityMinutes);
  if (excess === 0) return entries;

  const optionalEntries = entries
    .filter((entry) => entry.optional && entry.plannedMinutes > 0)
    .sort((left, right) => left.priority - right.priority);

  for (const entry of optionalEntries) {
    const reduction = getRoundedReduction(
      entry,
      excess,
      entry.plannedMinutes,
    );
    entry.plannedMinutes -= reduction;
    excess -= reduction;
    if (excess <= 0) return entries;
  }

  const reducibleEntries = entries
    .filter((entry) => {
      const definition = getTaskDefinition(entry.definitionId);
      return definition.capacityKind === "focused" && entry.plannedMinutes > 0;
    })
    .sort((left, right) => left.priority - right.priority);

  for (const entry of reducibleEntries) {
    const definition = getTaskDefinition(entry.definitionId);
    const reducible = Math.max(0, entry.plannedMinutes - definition.minMinutes);
    const reduction = getRoundedReduction(entry, excess, reducible);
    entry.plannedMinutes -= reduction;
    excess -= reduction;
    if (excess <= 0) return entries;
  }

  if (excess > 0) {
    const originalEntries = sourceEntries.map((entry) => ({ ...entry }));
    entries.forEach((entry) => {
      entry.plannedMinutes = 0;
    });

    let remainingCapacity = capacityMinutes;
    const anchor = originalEntries
      .filter(
        (entry) =>
          getTaskDefinition(entry.definitionId).capacityKind === "anchor" &&
          entry.plannedMinutes > 0,
      )
      .sort((left, right) => right.priority - left.priority)[0];

    if (anchor && remainingCapacity > 0) {
      const target = entries.find((entry) => entry.entryId === anchor.entryId);
      const allocated = getCapacityAllocation(anchor, remainingCapacity);
      if (target) target.plannedMinutes = allocated;
      remainingCapacity -= allocated;
    }

    const focus = originalEntries
      .filter(
        (entry) =>
          getTaskDefinition(entry.definitionId).capacityKind === "focused" &&
          entry.plannedMinutes > 0,
      )
      .sort((left, right) => right.priority - left.priority)[0];

    if (focus && remainingCapacity > 0) {
      const target = entries.find((entry) => entry.entryId === focus.entryId);
      if (target) {
        target.plannedMinutes = getCapacityAllocation(focus, remainingCapacity);
      }
    }
  }

  return entries;
}

function toTask(entry: WorkingEntry): TaskCheckItem {
  const definition = getTaskDefinition(entry.definitionId);
  return {
    id: `plan:${entry.entryId}`,
    title: definition.title,
    category: definition.category,
    plannedMinutes: entry.plannedMinutes,
    actualMinutes: 0,
    completed: false,
    isCore:
      definition.statusRole === "required" ||
      definition.statusRole === "control",
    isEveningTask:
      definition.capacityKind === "focused" ||
      definition.capacityKind === "anchor",
    definitionId: definition.id,
    entryId: entry.entryId,
    creditGroup: definition.creditGroup,
    capacityKind: definition.capacityKind,
    statusRole: definition.statusRole,
  };
}

function standaloneTask(
  definitionId: string,
  entryId: string,
  plannedMinutes: number,
): TaskCheckItem {
  return toTask({
    entryId,
    definitionId,
    plannedMinutes,
    priority: 0,
  });
}

function addAdjustment(
  adjustments: PlanAdjustmentCode[],
  code: PlanAdjustmentCode,
): void {
  if (!adjustments.includes(code)) adjustments.push(code);
}

export function getDefaultFocusedMinutes(
  dayContext: DayContext,
  exercised: boolean,
): number {
  if (dayContext === "rest_day") return exercised ? 270 : 330;
  return exercised ? 210 : 270;
}

export function buildDailyPlan(rawInput: DailyPlanInput): DailyPlanResult {
  const normalizedBonus = normalizeBonus(rawInput.workdayBonus);
  const input: DailyPlanInput = {
    exercised: Boolean(rawInput.exercised),
    energyLevel: rawInput.energyLevel,
    dayType: rawInput.dayType,
    dayContext: rawInput.dayContext,
    workdayBonus: normalizedBonus,
    ...(Number.isFinite(rawInput.availableFocusedMinutes)
      ? {
          availableFocusedMinutes: normalizeMinutes(
            rawInput.availableFocusedMinutes,
            480,
          ),
        }
      : {}),
  };

  const standardCoreMinutes = getProfileVariant(
    input.dayType,
    "normal",
  ).entries.reduce((sum, entry) => sum + entry.plannedMinutes, 0);
  const selectedEntries: WorkingEntry[] = getProfileVariant(
    input.dayType,
    input.energyLevel,
  ).entries.map((entry) => ({ ...entry }));
  const energyAdjustedCoreMinutes = sumEntries(selectedEntries);

  const credits = CREDIT_GROUPS.map((group) =>
    applyCredit(
      selectedEntries,
      group,
      getEnteredMinutes(normalizedBonus, group),
    ),
  );

  const afterCreditEntries = selectedEntries.filter(
    (entry) => entry.plannedMinutes > 0,
  );
  const beforeCapacityMinutes = sumEntries(afterCreditEntries);
  const capacityMinutes =
    input.availableFocusedMinutes ??
    getDefaultFocusedMinutes(input.dayContext, input.exercised);
  const trimmedEntries = trimEntriesToCapacity(
    afterCreditEntries,
    capacityMinutes,
  ).filter((entry) => entry.plannedMinutes > 0);
  const eveningCoreTargetMinutes = sumEntries(trimmedEntries);
  const capacityTrimmedMinutes =
    beforeCapacityMinutes - eveningCoreTargetMinutes;

  const passiveCredit = credits.find(
    (credit) => credit.group === "passive_listening",
  );
  const passiveReferenceRemainingMinutes = Math.max(
    0,
    PASSIVE_REFERENCE_MINUTES - (passiveCredit?.appliedMinutes ?? 0),
  );

  const tasks = trimmedEntries.map(toTask);
  if (passiveReferenceRemainingMinutes > 0) {
    tasks.push(
      standaloneTask(
        "passive-listening",
        "parallel:passive-listening",
        passiveReferenceRemainingMinutes,
      ),
    );
  }
  tasks.push(
    standaloneTask("sleep-stop-heavy", "control:sleep-stop-heavy", 0),
    standaloneTask(
      "sleep-no-compensation",
      "control:sleep-no-compensation",
      0,
    ),
  );

  const adjustmentCodes: PlanAdjustmentCode[] = [];
  if (input.energyLevel === "low") addAdjustment(adjustmentCodes, "low_energy");
  if (input.energyLevel === "high") {
    addAdjustment(adjustmentCodes, "high_energy");
  }
  if (input.exercised) addAdjustment(adjustmentCodes, "workout_start");
  if (input.dayContext === "rest_day") addAdjustment(adjustmentCodes, "rest_day");
  if (input.availableFocusedMinutes !== undefined) {
    addAdjustment(adjustmentCodes, "manual_capacity");
  }
  if (credits.some((credit) => credit.enteredMinutes > 0)) {
    addAdjustment(adjustmentCodes, "workday_credit");
  }
  if (capacityTrimmedMinutes > 0) {
    addAdjustment(adjustmentCodes, "capacity_trimmed");
  }
  if (passiveReferenceRemainingMinutes === 0) {
    addAdjustment(adjustmentCodes, "passive_reference_met");
  }
  if (input.dayType === "recovery" && input.energyLevel === "high") {
    addAdjustment(adjustmentCodes, "recovery_no_increase");
  }

  return {
    tasks,
    snapshot: {
      engineVersion: 1,
      input,
      credits,
      summary: {
        standardCoreMinutes,
        energyAdjustedCoreMinutes,
        appliedCoreCreditMinutes: credits
          .filter((credit) => credit.group !== "passive_listening")
          .reduce((sum, credit) => sum + credit.appliedMinutes, 0),
        extraCompletedMinutes: credits.reduce(
          (sum, credit) => sum + credit.extraMinutes,
          0,
        ),
        capacityMinutes,
        capacityTrimmedMinutes,
        eveningCoreTargetMinutes,
        passiveReferenceMinutes: PASSIVE_REFERENCE_MINUTES,
        passiveReferenceRemainingMinutes,
      },
      adjustmentCodes,
    },
  };
}

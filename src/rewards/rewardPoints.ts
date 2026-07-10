import type { DailyRecord, DayStatus } from "../types";
import { sortRecordsByDateDesc } from "../utils/date";

export const REWARD_POINTS_VERSION = 1;

const STATUS_POINTS: Record<DayStatus, number> = {
  green: 1,
  yellow: 0.5,
  red: 0,
  pending: 0,
};

const MAX_STRETCH_BONUS = 0.2;

export interface RewardGoalInput {
  id: string;
  title: string;
  targetPoints: number;
  note?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface RecordRewardPoints {
  date: string;
  status: DayStatus;
  baselinePoints: number;
  stretchPoints: number;
  totalPoints: number;
  stretchCompletedMinutes: number;
  stretchPlannedMinutes: number;
}

export interface RewardSummary {
  totalPoints: number;
  recent7Points: number;
  completedDays: number;
  averagePointsPerCompletedDay: number;
  goalTitle?: string;
  goalTargetPoints?: number;
  goalProgressRatio?: number;
  pointsRemaining?: number;
}

function roundToOneDecimal(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getStretchCompletedMinutes(record: DailyRecord): number {
  return (record.tasks || [])
    .filter((task) => task.planRole === "stretch" || task.capacityKind === "stretch")
    .reduce((sum, task) => sum + Math.max(0, task.actualMinutes || 0), 0);
}

function getStretchPlannedMinutes(record: DailyRecord): number {
  return Math.max(0, record.planSnapshot?.stretch?.plannedMinutes || 0);
}

function calculateStretchPoints(record: DailyRecord): number {
  if (record.status === "pending") return 0;
  if (record.planSnapshot?.stretch?.enabled !== true) return 0;

  const plannedMinutes = getStretchPlannedMinutes(record);
  if (plannedMinutes <= 0) return 0;

  const completedMinutes = getStretchCompletedMinutes(record);
  const completionRatio = Math.min(1, completedMinutes / plannedMinutes);

  return roundToOneDecimal(MAX_STRETCH_BONUS * completionRatio);
}

export function calculateRecordRewardPoints(record: DailyRecord): RecordRewardPoints {
  const baselinePoints = STATUS_POINTS[record.status] ?? 0;
  const stretchPoints = calculateStretchPoints(record);
  const totalPoints = record.status === "pending"
    ? 0
    : roundToOneDecimal(baselinePoints + stretchPoints);

  return {
    date: record.date,
    status: record.status,
    baselinePoints,
    stretchPoints,
    totalPoints,
    stretchCompletedMinutes: getStretchCompletedMinutes(record),
    stretchPlannedMinutes: getStretchPlannedMinutes(record),
  };
}

export function calculateRewardSummary(
  records: DailyRecord[],
  goal?: RewardGoalInput,
): RewardSummary {
  const sortedRecords = sortRecordsByDateDesc(records);
  const allPoints = sortedRecords.map(calculateRecordRewardPoints);
  const totalPoints = roundToOneDecimal(
    allPoints.reduce((sum, item) => sum + item.totalPoints, 0),
  );
  const recent7Points = roundToOneDecimal(
    allPoints.slice(0, 7).reduce((sum, item) => sum + item.totalPoints, 0),
  );
  const completedDays = sortedRecords.filter((record) => record.status !== "pending").length;
  const averagePointsPerCompletedDay = completedDays > 0
    ? roundToOneDecimal(totalPoints / completedDays)
    : 0;

  const summary: RewardSummary = {
    totalPoints,
    recent7Points,
    completedDays,
    averagePointsPerCompletedDay,
  };

  if (goal && Number.isFinite(goal.targetPoints) && goal.targetPoints > 0) {
    const rawProgressRatio = totalPoints / goal.targetPoints;
    summary.goalTitle = goal.title;
    summary.goalTargetPoints = goal.targetPoints;
    summary.goalProgressRatio = roundToTwoDecimals(Math.max(0, Math.min(1, rawProgressRatio)));
    summary.pointsRemaining = roundToOneDecimal(Math.max(0, goal.targetPoints - totalPoints));
  }

  return summary;
}

export function formatPoints(points: number): string {
  return roundToOneDecimal(points).toFixed(1).replace(/\.0$/, "");
}

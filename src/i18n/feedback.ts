import type { DataHealthIssue } from "../types";

const DATA_HEALTH_COPY: Record<string, string> = {
  APP_DATA_NOT_OBJECT: "应用数据格式不正确。",
  RECORDS_NOT_OBJECT: "学习记录集合格式不正确。",
  INVALID_RECORD_KEY: "记录的日期格式不正确。",
  KEY_NOT_NORMALIZED: "记录日期需要统一为“年-月-日”格式。",
  RECORD_NOT_OBJECT: "这条学习记录格式不正确。",
  INVALID_RECORD_DATE: "记录日期缺失或格式不正确。",
  DATE_KEY_MISMATCH: "记录日期与保存日期不一致。",
  INVALID_CREATED_AT: "创建时间缺失或无效。",
  INVALID_UPDATED_AT: "修改时间缺失或无效，可能影响云同步。",
  INVALID_STATUS: "记录的完成状态无效。",
  INVALID_DAY_TYPE: "记录的学习重点无效。",
  WORKDAY_BONUS_INVALID_SPEAKING_MINUTES: "已完成的口语时长应为非负的有效数字。",
  TASKS_NOT_ARRAY: "学习任务列表格式不正确。",
  TASK_MISSING_FIELDS: "有任务缺少名称、分类或标识。",
  TASK_INVALID_ACTUAL_MINUTES: "有任务的实际学习时长无效。",
  TASK_INVALID_PLANNED_MINUTES: "有任务的计划时长无效。",
  TASK_UNKNOWN_DEFINITION_ID: "有任务使用了未识别的类型，旧记录仍会保留。",
  PLAN_SNAPSHOT_MISSING_FIELDS: "保存的计划缺少必要信息或生成时间无效。",
  INVALID_PLAN_ENGINE_VERSION: "保存的计划版本暂不受支持。",
  PLAN_STRETCH_INVALID_ENABLED: "加练开关的数据格式无效。",
  PLAN_STRETCH_INVALID_STRATEGY: "加练方式无效。",
  PLAN_STRETCH_INVALID_BUDGET: "加练可用时长无效。",
  PLAN_STRETCH_INVALID_PLANNED: "加练计划时长无效。",
  INVALID_PLAN_SUMMARY: "计划概览中的时长缺失或无效。",
  PLAN_INPUT_MISMATCH: "当前记录的设置与生成计划时的设置不一致。",
  DUPLICATE_NORMALIZED_KEYS: "同一天存在多条记录，需要检查重复数据。",
  INVALID_DELETED_RECORD_KEY: "删除记录中的日期格式不正确。",
  REWARDS_NOT_OBJECT: "奖励设置格式不正确。",
  REWARDS_INVALID_SCHEMA_VERSION: "奖励设置版本无效。",
  REWARDS_INVALID_SYNC_METADATA: "奖励目标的同步时间或设备标识无效。",
  REWARD_GOAL_NOT_OBJECT: "当前奖励目标格式不正确。",
  REWARD_GOAL_INVALID_ID: "奖励目标的标识缺失或无效。",
  REWARD_GOAL_INVALID_TITLE: "奖励名称缺失或无效。",
  REWARD_GOAL_INVALID_TARGET_POINTS: "奖励目标积分应在 1 到 999 之间。",
  REWARD_GOAL_NOTE_TOO_LONG: "奖励说明内容过长。",
  REWARD_GOAL_INVALID_CREATED_AT: "奖励目标的创建时间缺失或无效。",
  REWARD_GOAL_INVALID_COMPLETED_AT: "奖励目标的完成时间无效。",
};

export function formatDataHealthIssue(issue: DataHealthIssue): string {
  return DATA_HEALTH_COPY[issue.code] ?? "发现异常数据，请导出备份后检查。";
}

export function formatWallpaperError(error: unknown, fallback: string): string {
  const message = error && typeof error === "object" && "message" in error ? error.message : undefined;
  return typeof message === "string" && /[\u3400-\u9fff]/.test(message) ? message : fallback;
}

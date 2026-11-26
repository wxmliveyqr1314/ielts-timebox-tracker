import { useState, useEffect } from "react";
import { DailyRecord, DayContext } from "../types";
import { formatDateStr, sortRecordsByDateDesc } from "../utils/date";
import { cn } from "../lib/utils";
import { 
  CheckCircle2, ChevronDown, ChevronUp, Calendar, Trash2, X, Clock3
} from "lucide-react";
import { calculateColorStatus } from "../utils/status";
import { getModuleMinutes, getRecentRecords } from "../utils/stats";
import { syncSleepControlTasks, syncRecordFieldsFromSleepControlTasks } from "../utils/sleepControl";
import { formatDayStatus, formatEnergyLevel, formatFocusMode, formatWeekday } from "../utils/display";
import { formatTaskTitle } from "../i18n/taskCopy";
import { PlanSummary } from "../components/daily/PlanSummary";

// Helper to extract minutes
function getRecordMetrics(record: DailyRecord) {
  const totals = getModuleMinutes([record]);
  return {
    formalMinutes: totals.totalFormal,
    passiveMinutes: totals.totalPassive,
    speakingMinutes: totals.totalSpeaking,
  };
}

export function HistoryPage({ appData }: { appData: any }) {
  const records = sortRecordsByDateDesc(
    Object.values(appData.data.records as Record<string, DailyRecord>)
  );

  function SummarySegment({ label, value, tone }: {
    label: string;
    value: number;
    tone: "slate" | "green" | "yellow" | "red";
  }) {
    const tones = {
      slate: "text-slate-600",
      green: "text-emerald-600",
      yellow: "text-amber-600",
      red: "text-rose-600",
    };
    return (
      <div className="flex-1 min-w-0 px-2 py-2 text-center">
        <div className={`text-lg font-bold tabular-nums ${tones[tone]}`}>{value}</div>
        <div className="text-[10px] font-semibold text-slate-500">{label}</div>
      </div>
    );
  }

  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  useEffect(() => {
    if (deleteMessage) {
      const timer = setTimeout(() => setDeleteMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [deleteMessage]);

  const handleDelete = (date: string) => {
    appData.deleteRecord(date);
    setDeleteMessage("本地记录已删除。请到设置点击“立即同步”，更新云端备份。");
  };

  const last7Days = getRecentRecords(records, 7);
  const greenDays = last7Days.filter(r => r.status === "green").length;
  const yellowDays = last7Days.filter(r => r.status === "yellow").length;
  const redDays = last7Days.filter(r => r.status === "red").length;
  const pendingDays = last7Days.filter(r => r.status === "pending").length;

  const toggleExpand = (date: string) => {
    setExpandedDate(prev => prev === date ? null : date);
  };

  const statusColors = {
    green: "bg-emerald-50 text-emerald-600 border-emerald-200",
    yellow: "bg-amber-50 text-amber-600 border-amber-200",
    red: "bg-rose-50 text-rose-600 border-rose-200",
    pending: "bg-slate-50 text-slate-500 border-slate-200",
  };

  const statusBorderColors = {
    green: "bg-emerald-500",
    yellow: "bg-amber-500",
    red: "bg-rose-500",
    pending: "bg-slate-400",
  };

  return (
    <div className="flex flex-col gap-6">
      <div role="region" aria-label="最近学习记录概览" className="wallpaper-surface rounded-lg border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold text-slate-800">历史</h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">最近 7 天</span>
        </div>
        <div className="flex bg-slate-50/50 rounded-lg border border-slate-200/70 overflow-hidden divide-x divide-slate-200/70">
          <SummarySegment label="天数" value={last7Days.length} tone="slate" />
          <SummarySegment label="达标" value={greenDays} tone="green" />
          <SummarySegment label="部分完成" value={yellowDays} tone="yellow" />
          <SummarySegment label="需调整" value={redDays} tone="red" />
          <SummarySegment label="待开始" value={pendingDays} tone="slate" />
        </div>
      </div>

      <div className="space-y-4">
        {deleteMessage && (
          <div className="p-3 bg-slate-800 text-white text-sm rounded-lg flex items-center justify-between shadow-lg">
            <span>{deleteMessage}</span>
            <button onClick={() => setDeleteMessage(null)} className="text-slate-400 hover:text-white p-1" aria-label="关闭提示"><X className="w-4 h-4" /></button>
          </div>
        )}
        {records.length === 0 && (
          <div className="py-14 text-center wallpaper-surface rounded-lg border border-slate-200">
            <Calendar className="w-5 h-5 mx-auto text-slate-400 mb-3" />
            <p className="text-sm font-semibold text-slate-600">暂无历史记录</p>
            <p className="text-xs text-slate-500 mt-1">完成学习后，可以在这里查看记录。</p>
          </div>
        )}
        {records.map((record) => {
          const metrics = getRecordMetrics(record);
          const isExpanded = expandedDate === record.date;
          
          return (
            <div key={record.date} className="wallpaper-surface rounded-lg border border-slate-200 overflow-hidden shadow-sm flex flex-col relative">
              <div className={cn("absolute left-0 top-0 bottom-0 w-1", statusBorderColors[record.status || "pending"])} />
              <button
                type="button"
                className="w-full p-4 pl-5 text-left hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 flex items-center justify-between"
                onClick={() => toggleExpand(record.date)}
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? "收起" : "展开"}${formatDateStr(record.date)}`}
              >
                <div className="flex flex-col flex-1 pr-4 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-800">{formatDateStr(record.date)}</span>
                    <span className="text-xs font-semibold text-slate-400">{formatWeekday(record.weekday)}</span>
                    {record.exercised && <span className="text-[10px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">已运动</span>}
                  </div>
                  <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex flex-wrap gap-x-3 gap-y-1">
                    <span>{formatFocusMode(record.dayType)}</span>
                    <span>{formatEnergyLevel(record.energyLevel)}</span>
                    <span className="text-indigo-500">正式学习：{metrics.formalMinutes}分钟</span>
                    <span>泛听：{metrics.passiveMinutes}分钟</span>
                    <span>口语：{metrics.speakingMinutes}分钟</span>
                  </div>
                  {record.tomorrowFirstStep && (
                     <div className="mt-2 text-xs text-slate-500 truncate">
                        <span className="font-semibold text-slate-400">明日第一步：</span> {record.tomorrowFirstStep}
                     </div>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className={cn("px-2.5 py-1 rounded-lg border flex items-center justify-center font-bold text-[10px] uppercase", statusColors[record.status || "pending"])}>
                    {formatDayStatus(record.status || "pending")}
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                  <RecordDetail record={record} updateRecord={appData.updateRecord} deleteRecord={handleDelete} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoricalPlanSummary({ record }: { record: DailyRecord }) {
  const snapshot = record.planSnapshot;
  if (!snapshot) return null;

  const completedEarlierMinutes = snapshot.credits.reduce(
    (sum, credit) => sum + credit.enteredMinutes,
    0,
  );
  const completedStretchMinutes = record.tasks
    .filter(
      (task) =>
        task.planRole === "stretch" || task.capacityKind === "stretch",
    )
    .reduce((sum, task) => sum + Math.max(0, task.actualMinutes || 0), 0);

  return (
    <section
      aria-label="历史计划概览"
      className="space-y-3 rounded-xl border border-slate-200 bg-white/50 p-4 wallpaper-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            已生成的计划
          </h3>
          <p className="mt-1 text-[10px] text-slate-400">
            当日保存的学习安排
          </p>
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase text-indigo-600">
          {snapshot.input.dayContext === "rest_day" ? "休息日" : "工作日"}
        </span>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-emerald-50/80 px-3 py-2">
        <span className="text-xs font-semibold text-emerald-700">提前完成的学习</span>
        <span className="font-mono text-xs font-bold text-emerald-900">
          {completedEarlierMinutes}分钟
        </span>
      </div>

      <PlanSummary snapshot={snapshot} />

      {snapshot.stretch?.enabled && (
        <div
          aria-label="历史加练情况"
          className="border-t border-indigo-100 pt-3"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
              可选加练
            </span>
            <span className="text-xs font-bold text-slate-700">
              {snapshot.stretch.strategy === "balanced"
                ? "均衡加练"
                : "同方向加练"}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            从 {snapshot.stretch.budgetMinutes}分钟余量中安排了 {snapshot.stretch.plannedMinutes}分钟加练；
            已完成 {completedStretchMinutes}分钟。加练不影响当天状态。
          </p>
        </div>
      )}
    </section>
  );
}

function planInputsDifferFromSnapshot(record: DailyRecord): boolean {
  const input = record.planSnapshot?.input;
  if (!input) return false;
  return (
    (record.dayContext ?? "workday") !== input.dayContext ||
    record.exercised !== input.exercised ||
    record.energyLevel !== input.energyLevel ||
    record.dayType !== input.dayType ||
    record.availableFocusedMinutes !== input.availableFocusedMinutes ||
    JSON.stringify(record.workdayBonus) !== JSON.stringify(input.workdayBonus)
  );
}

function RecordDetail({ record, updateRecord, deleteRecord }: { record: DailyRecord, updateRecord: any, deleteRecord: (date: string) => void }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [planInputsChanged, setPlanInputsChanged] = useState(() =>
    planInputsDifferFromSnapshot(record),
  );

  const handleTaskUpdate = (taskId: string, field: "actualMinutes" | "completed" | "notes", value: any) => {
    updateRecord(record.date, (prev: DailyRecord) => {
      const newTasks = prev.tasks.map(t => {
        if (t.id === taskId) {
          const updatedTask = { ...t, [field]: value };
          if (field === "actualMinutes" && typeof value === "number") {
             updatedTask.completed = value > 0;
          } else if (field === "completed" && typeof value === "boolean") {
             if (value && updatedTask.actualMinutes === 0) updatedTask.actualMinutes = updatedTask.plannedMinutes;
             if (!value) updatedTask.actualMinutes = 0;
          }
          return updatedTask;
        }
        return t;
      });
      const updated = { ...prev, tasks: newTasks };
      return syncRecordFieldsFromSleepControlTasks(updated);
    });
  };

  const handleRecordUpdate = (field: keyof DailyRecord, value: any) => {
    updateRecord(record.date, (prev: DailyRecord) => {
      if (field === "stoppedAfter2230" || field === "noCompensatoryStayingUp") {
        return syncSleepControlTasks(prev, { [field]: value });
      }
      const updated = { ...prev, [field]: value };
      updated.status = calculateColorStatus(updated);
      return updated;
    });
  };

  const handlePlanInputUpdate = (field: "dayContext", value: DayContext) => {
    setPlanInputsChanged(true);
    updateRecord(record.date, (prev: DailyRecord) => ({
      ...prev,
      [field]: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  return (
    <div className="space-y-6">
      <HistoricalPlanSummary record={record} />

      {record.planSnapshot && (
        <section className="space-y-3">
          <div>
            <label htmlFor={`history-day-context-${record.date}`} className="mb-1 block text-xs font-semibold text-slate-600">
              当天安排
            </label>
            <select
              id={`history-day-context-${record.date}`}
              value={record.dayContext ?? record.planSnapshot.input.dayContext}
              onChange={(event) => handlePlanInputUpdate("dayContext", event.target.value as DayContext)}
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="workday">工作日</option>
              <option value="rest_day">休息日</option>
            </select>
          </div>

          {planInputsChanged && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="font-bold">计划设置已变更</p>
              <p className="mt-1">当前任务尚未重新生成。请到“今日”预览并应用新计划。</p>
            </div>
          )}
        </section>
      )}

      <div className="space-y-0">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-2">学习任务</h3>
        {record.tasks.map(task => (
          <div key={task.id} className="py-3 border-b border-slate-200/70 last:border-b-0 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button 
                  onClick={() => handleTaskUpdate(task.id, "completed", !task.completed)}
                  className={cn("w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-colors", task.completed ? "bg-emerald-500 border-emerald-600 text-white" : "bg-white border-slate-300")}
                  aria-label={task.completed ? "标记为未完成" : "标记为完成"}
                >
                  {task.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
                <span className={cn("text-sm font-semibold break-words leading-snug", task.completed ? "text-slate-400 line-through" : "text-slate-700")}>
                  {formatTaskTitle(task)}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase hidden sm:inline">计划 {task.plannedMinutes}分钟</span>
                <div className="w-14 shrink-0">
                  {task.category !== "sleep_control" ? (
                    <input
                      type="number"
                      min="0"
                      className="w-full text-center text-xs font-mono py-1 border border-slate-200 rounded-md focus:outline-none focus:border-indigo-500 bg-white/80"
                      value={task.actualMinutes || ""}
                      placeholder="0"
                      onChange={(e) => handleTaskUpdate(task.id, "actualMinutes", parseInt(e.target.value) || 0)}
                    />
                  ) : (
                    <div className="w-full text-center text-xs font-mono py-1 border border-transparent text-slate-400">
                      --
                    </div>
                  )}
                </div>
              </div>
            </div>
            <input 
              type="text"
              placeholder="任务备注（选填）"
              className="w-full text-xs p-2 bg-white/50 border border-slate-200/70 rounded-md focus:outline-none focus:bg-white focus:border-indigo-300"
              value={task.notes || ""}
              onChange={(e) => handleTaskUpdate(task.id, "notes", e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="space-y-4 border-t border-slate-200 pt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">当日详情</h3>
        
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">明日第一步</label>
          <input 
            type="text"
            className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            value={record.tomorrowFirstStep || ""}
            onChange={(e) => handleRecordUpdate("tomorrowFirstStep", e.target.value)}
            placeholder="明天准备先做哪一件具体的事？"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">学习备注</label>
          <textarea 
            className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 min-h-[80px]"
            value={record.notes || ""}
            onChange={(e) => handleRecordUpdate("notes", e.target.value)}
            placeholder="记录今天的体会或需要调整的地方"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
            <button 
              onClick={() => handleRecordUpdate("stoppedAfter2230", !record.stoppedAfter2230)}
              className={cn("w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-colors", record.stoppedAfter2230 ? "bg-emerald-500 border-emerald-600 text-white" : "bg-slate-100 border-slate-300")}
            >
              {record.stoppedAfter2230 && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
            <span className="text-xs font-semibold text-slate-600 leading-tight">22:30 后不再开启高强度任务</span>
          </div>

          <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
            <button 
              onClick={() => handleRecordUpdate("noCompensatoryStayingUp", !record.noCompensatoryStayingUp)}
              className={cn("w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-colors", record.noCompensatoryStayingUp ? "bg-emerald-500 border-emerald-600 text-white" : "bg-slate-100 border-slate-300")}
            >
              {record.noCompensatoryStayingUp && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
            <span className="text-xs font-semibold text-slate-600 leading-tight">不补偿性熬夜</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">就寝时间（选填）</label>
          <input 
            type="time"
            className="text-sm p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 w-32"
            value={record.bedtime || ""}
            onChange={(e) => handleRecordUpdate("bedtime", e.target.value)}
          />
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 flex justify-end">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-rose-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            删除记录
          </button>
        ) : (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 w-full">
            <h4 className="text-xs font-bold text-rose-700 mb-1 flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" />
              确认删除记录？
            </h4>
            <p className="text-[10px] text-rose-600 mb-3">
              这会删除本地记录；下次点击“立即同步”时，也会同步删除云端记录。建议先在设置中导出 JSON 备份。
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 bg-white text-slate-600 border border-slate-200 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  deleteRecord(record.date);
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-rose-700 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

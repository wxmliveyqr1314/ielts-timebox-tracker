import { useState, useEffect } from "react";
import { DailyRecord, DayContext } from "../types";
import { formatDateStr, sortRecordsByDateDesc } from "../utils/date";
import { cn } from "../lib/utils";
import { 
  CheckCircle2, ChevronDown, ChevronUp, Calendar, Trash2, X, Clock3
} from "lucide-react";
import { 
  calculateColorStatus, isMomoTask, isMainTaskForDay, isSpeakingTask 
} from "../utils/status";
import { syncSleepControlTasks, syncRecordFieldsFromSleepControlTasks } from "../utils/sleepControl";
import { formatFocusMode } from "../utils/display";
import { PlanSummary } from "../components/daily/PlanSummary";

// Helper to extract minutes
function getRecordMetrics(record: DailyRecord) {
  const tasks = record.tasks || [];
  const momoTasks = tasks.filter(isMomoTask);
  const mainTasks = tasks.filter(t => isMainTaskForDay(t, record.dayType));
  const speakingTasks = tasks.filter(isSpeakingTask);
  const passiveTasks = tasks.filter(t => t.category === "passive_listening");

  const momoMinutes = momoTasks.reduce((acc, t) => acc + t.actualMinutes, 0) + (record.workdayBonus?.momoMinutes || 0);
  const mainMinutes = mainTasks.reduce((acc, t) => acc + t.actualMinutes, 0);
  const speakingMinutes = speakingTasks.reduce((acc, t) => acc + t.actualMinutes, 0);
  const eveningFormalMinutes = momoMinutes + mainMinutes + speakingMinutes;
  
  const passiveMinutes = passiveTasks.reduce((acc, t) => acc + t.actualMinutes, 0) + (record.workdayBonus?.passiveListeningMinutes || 0);

  const stoppedAfter2230Task = tasks.find(t => t.title.includes("22:30"));
  const stoppedAfter2230 = stoppedAfter2230Task ? stoppedAfter2230Task.completed : record.stoppedAfter2230;

  const noCompensatoryTask = tasks.find(t => t.title.includes("没有补偿性熬夜"));
  const noCompensatoryStayingUp = noCompensatoryTask ? noCompensatoryTask.completed : record.noCompensatoryStayingUp;

  return { eveningFormalMinutes, passiveMinutes, speakingMinutes, stoppedAfter2230, noCompensatoryStayingUp };
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
    setDeleteMessage("Record deleted locally. Tap Sync now in Settings to update cloud backup.");
  };

  const last7Days = records.slice(0, 7);
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
      <div className="wallpaper-surface rounded-lg border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold text-slate-800">History</h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Last 7 days</span>
        </div>
        <div className="flex bg-slate-50/50 rounded-lg border border-slate-200/70 overflow-hidden divide-x divide-slate-200/70">
          <SummarySegment label="Days" value={last7Days.length} tone="slate" />
          <SummarySegment label="Green" value={greenDays} tone="green" />
          <SummarySegment label="Yellow" value={yellowDays} tone="yellow" />
          <SummarySegment label="Red" value={redDays} tone="red" />
          <SummarySegment label="Pending" value={pendingDays} tone="slate" />
        </div>
      </div>

      <div className="space-y-4">
        {deleteMessage && (
          <div className="p-3 bg-slate-800 text-white text-sm rounded-lg flex items-center justify-between shadow-lg">
            <span>{deleteMessage}</span>
            <button onClick={() => setDeleteMessage(null)} className="text-slate-400 hover:text-white p-1" aria-label="Dismiss message"><X className="w-4 h-4" /></button>
          </div>
        )}
        {records.length === 0 && (
          <div className="py-14 text-center wallpaper-surface rounded-lg border border-slate-200">
            <Calendar className="w-5 h-5 mx-auto text-slate-400 mb-3" />
            <p className="text-sm font-semibold text-slate-600">No history yet</p>
            <p className="text-xs text-slate-500 mt-1">Completed days will appear here.</p>
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
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${formatDateStr(record.date)}`}
              >
                <div className="flex flex-col flex-1 pr-4 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-800">{formatDateStr(record.date)}</span>
                    <span className="text-xs font-semibold text-slate-400">{record.weekday}</span>
                    {record.exercised && <span className="text-[10px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">Workout</span>}
                  </div>
                  <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex flex-wrap gap-x-3 gap-y-1">
                    <span>{formatFocusMode(record.dayType)}</span>
                    <span>{record.energyLevel} Energy</span>
                    <span className="text-indigo-500">Evening: {metrics.eveningFormalMinutes}m</span>
                    <span>Passive: {metrics.passiveMinutes}m</span>
                    <span>Speak: {metrics.speakingMinutes}m</span>
                  </div>
                  {record.tomorrowFirstStep && (
                     <div className="mt-2 text-xs text-slate-500 truncate">
                        <span className="font-semibold text-slate-400">Next:</span> {record.tomorrowFirstStep}
                     </div>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className={cn("px-2.5 py-1 rounded-lg border flex items-center justify-center font-bold text-[10px] uppercase", statusColors[record.status || "pending"])}>
                    {record.status || "pending"}
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

  return (
    <section
      aria-label="Historical plan summary"
      className="space-y-3 rounded-xl border border-slate-200 bg-white/50 p-4 wallpaper-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Generated plan
          </h3>
          <p className="mt-1 text-[10px] text-slate-400">
            Saved by planning engine v{snapshot.engineVersion}
          </p>
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase text-indigo-600">
          {snapshot.input.dayContext === "rest_day" ? "Rest day" : "Workday"}
        </span>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-emerald-50/80 px-3 py-2">
        <span className="text-xs font-semibold text-emerald-700">Completed earlier</span>
        <span className="font-mono text-xs font-bold text-emerald-900">
          {completedEarlierMinutes}m
        </span>
      </div>

      <PlanSummary snapshot={snapshot} />
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
              Historical day context
            </label>
            <select
              id={`history-day-context-${record.date}`}
              value={record.dayContext ?? record.planSnapshot.input.dayContext}
              onChange={(event) => handlePlanInputUpdate("dayContext", event.target.value as DayContext)}
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="workday">Workday</option>
              <option value="rest_day">Rest day</option>
            </select>
          </div>

          {planInputsChanged && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="font-bold">Plan inputs changed</p>
              <p className="mt-1">Existing tasks were not regenerated. Use Daily to preview and apply a new plan.</p>
            </div>
          )}
        </section>
      )}

      <div className="space-y-0">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-2">Tasks</h3>
        {record.tasks.map(task => (
          <div key={task.id} className="py-3 border-b border-slate-200/70 last:border-b-0 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button 
                  onClick={() => handleTaskUpdate(task.id, "completed", !task.completed)}
                  className={cn("w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-colors", task.completed ? "bg-emerald-500 border-emerald-600 text-white" : "bg-white border-slate-300")}
                  aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                >
                  {task.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
                <span className={cn("text-sm font-semibold break-words leading-snug", task.completed ? "text-slate-400 line-through" : "text-slate-700")}>
                  {task.title}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase hidden sm:inline">Plan {task.plannedMinutes}m</span>
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
              placeholder="Task notes (optional)"
              className="w-full text-xs p-2 bg-white/50 border border-slate-200/70 rounded-md focus:outline-none focus:bg-white focus:border-indigo-300"
              value={task.notes || ""}
              onChange={(e) => handleTaskUpdate(task.id, "notes", e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="space-y-4 border-t border-slate-200 pt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Daily Details</h3>
        
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Tomorrow's First Step</label>
          <input 
            type="text"
            className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
            value={record.tomorrowFirstStep || ""}
            onChange={(e) => handleRecordUpdate("tomorrowFirstStep", e.target.value)}
            placeholder="What's the very first action tomorrow?"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">General Notes</label>
          <textarea 
            className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 min-h-[80px]"
            value={record.notes || ""}
            onChange={(e) => handleRecordUpdate("notes", e.target.value)}
            placeholder="Any reflections?"
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
            <span className="text-xs font-semibold text-slate-600 leading-tight">Stopped after 22:30</span>
          </div>

          <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
            <button 
              onClick={() => handleRecordUpdate("noCompensatoryStayingUp", !record.noCompensatoryStayingUp)}
              className={cn("w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-colors", record.noCompensatoryStayingUp ? "bg-emerald-500 border-emerald-600 text-white" : "bg-slate-100 border-slate-300")}
            >
              {record.noCompensatoryStayingUp && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
            <span className="text-xs font-semibold text-slate-600 leading-tight">No compensatory staying up</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Bedtime (optional)</label>
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
            Delete Record
          </button>
        ) : (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 w-full">
            <h4 className="text-xs font-bold text-rose-700 mb-1 flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" />
              Delete Record?
            </h4>
            <p className="text-[10px] text-rose-600 mb-3">
              This will delete your local record. If you use cloud sync, the deletion will be synced to the cloud on your next 'Sync now'. Consider exporting a JSON backup in Settings first.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 bg-white text-slate-600 border border-slate-200 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteRecord(record.date);
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-rose-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

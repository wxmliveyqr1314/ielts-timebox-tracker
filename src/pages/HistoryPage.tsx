import { useState } from "react";
import { AppState, DailyRecord } from "../types";
import { formatDateStr } from "../utils/date";
import { cn } from "../lib/utils";
import { 
  CheckCircle2, ChevronDown, ChevronUp, Calendar
} from "lucide-react";
import { 
  calculateColorStatus, isMomoTask, isMainTaskForDay, isSpeakingTask 
} from "../utils/status";

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
  const records = Object.values(appData.data.records as Record<string, DailyRecord>).sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const last7Days = records.slice(0, 7);
  const greenDays = last7Days.filter(r => r.status === "green").length;
  const yellowDays = last7Days.filter(r => r.status === "yellow").length;
  const redDays = last7Days.filter(r => r.status === "red").length;

  const toggleExpand = (date: string) => {
    setExpandedDate(prev => prev === date ? null : date);
  };

  const statusColors = {
    green: "bg-emerald-50 text-emerald-600 border-emerald-200",
    yellow: "bg-amber-50 text-amber-600 border-amber-200",
    red: "bg-rose-50 text-rose-600 border-rose-200",
    pending: "bg-slate-50 text-slate-500 border-slate-200",
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Last 7 Days Summary
        </h2>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
            <div className="text-xl font-black text-slate-700">{last7Days.length}</div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Days</div>
          </div>
          <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
            <div className="text-xl font-black text-emerald-600">{greenDays}</div>
            <div className="text-[10px] uppercase font-bold text-emerald-500">Green</div>
          </div>
          <div className="bg-amber-50 p-2 rounded-xl border border-amber-100">
            <div className="text-xl font-black text-amber-600">{yellowDays}</div>
            <div className="text-[10px] uppercase font-bold text-amber-500">Yellow</div>
          </div>
          <div className="bg-rose-50 p-2 rounded-xl border border-rose-100">
            <div className="text-xl font-black text-rose-600">{redDays}</div>
            <div className="text-[10px] uppercase font-bold text-rose-500">Red</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {records.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm">No history records found.</div>
        )}
        {records.map((record) => {
          const metrics = getRecordMetrics(record);
          const isExpanded = expandedDate === record.date;
          
          return (
            <div key={record.date} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all">
              <div 
                className="p-4 cursor-pointer hover:bg-slate-50 flex items-center justify-between"
                onClick={() => toggleExpand(record.date)}
              >
                <div className="flex flex-col flex-1 pr-4 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-800">{formatDateStr(record.date)}</span>
                    <span className="text-xs font-semibold text-slate-400">{record.weekday}</span>
                    {record.exercised && <span className="text-[10px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">Workout</span>}
                  </div>
                  <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex flex-wrap gap-x-3 gap-y-1">
                    <span>{record.dayType.replace("_", " ")}</span>
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
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                  <RecordDetail record={record} updateRecord={appData.updateRecord} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecordDetail({ record, updateRecord }: { record: DailyRecord, updateRecord: any }) {
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
      const { syncRecordFieldsFromSleepControlTasks } = require("../utils/tasks");
      return syncRecordFieldsFromSleepControlTasks(updated);
    });
  };

  const handleRecordUpdate = (field: keyof DailyRecord, value: any) => {
    updateRecord(record.date, (prev: DailyRecord) => {
      if (field === "stoppedAfter2230" || field === "noCompensatoryStayingUp") {
        const { syncSleepControlTasks } = require("../utils/tasks");
        return syncSleepControlTasks(prev, { [field]: value });
      }
      const updated = { ...prev, [field]: value };
      updated.status = calculateColorStatus(updated);
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-2">Tasks</h3>
        {record.tasks.map(task => (
          <div key={task.id} className="flex flex-col bg-white p-3 rounded-xl border border-slate-200 shadow-sm gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                <button 
                  onClick={() => handleTaskUpdate(task.id, "completed", !task.completed)}
                  className={cn("w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-colors", task.completed ? "bg-emerald-500 border-emerald-600 text-white" : "bg-slate-100 border-slate-300")}
                >
                  {task.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
                <span className={cn("text-sm font-semibold truncate", task.completed ? "text-slate-400 line-through" : "text-slate-700")}>
                  {task.title}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase hidden sm:inline">Plan {task.plannedMinutes}m</span>
                <input 
                  type="number"
                  min="0"
                  className="w-12 text-center text-xs font-mono py-1 border rounded-md focus:outline-none focus:border-indigo-500"
                  value={task.actualMinutes || ""}
                  placeholder="0"
                  onChange={(e) => handleTaskUpdate(task.id, "actualMinutes", parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <input 
              type="text"
              placeholder="Task notes (optional)"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-100 rounded-md focus:outline-none focus:bg-white focus:border-indigo-300"
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
    </div>
  );
}

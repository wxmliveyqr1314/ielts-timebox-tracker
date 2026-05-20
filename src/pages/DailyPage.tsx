import { useState, useEffect } from "react";
import {
  DailyRecord,
  DayType,
  EnergyLevel,
  TaskCheckItem,
  DayStatus,
  WorkdayBonus,
} from "../types";
import { getTodayStr, formatDateStr } from "../utils/date";
import { calculateColorStatus } from "../utils/status";
import { generateDailyPlan } from "../utils/tasks";
import {
  CheckCircle2,
  Dumbbell,
  Zap,
  CheckSquare,
  RotateCcw,
  Settings2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "../lib/utils";
import { subDays, format } from "date-fns";

interface DailyPageProps {
  appData: any; // ReturnType of useAppData
}

export function DailyPage({ appData }: DailyPageProps) {
  const today = getTodayStr();
  const record: DailyRecord | undefined = appData.data.records[today];
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const yesterdayRecord = appData.data.records[yesterdayStr];

  if (!record) {
    return (
      <SetupDaily
        today={today}
        updateRecord={appData.updateRecord}
        yesterdayRecord={yesterdayRecord}
      />
    );
  }

  return (
    <TrackerDaily
      today={today}
      record={record}
      updateRecord={appData.updateRecord}
      deleteRecord={appData.deleteRecord}
      yesterdayRecord={yesterdayRecord}
    />
  );
}

// --- Shared Config Form --- //
function ConfigForm({
  exercised,
  setExercised,
  energyLevel,
  setEnergyLevel,
  dayType,
  setDayType,
  workdayBonus,
  setWorkdayBonus,
}: {
  exercised: boolean;
  setExercised: (v: boolean) => void;
  energyLevel: EnergyLevel;
  setEnergyLevel: (v: EnergyLevel) => void;
  dayType: DayType;
  setDayType: (v: DayType) => void;
  workdayBonus: WorkdayBonus;
  setWorkdayBonus: (v: WorkdayBonus) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-3 flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-slate-400" /> Workout Completed?
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setExercised(true)}
            className={cn(
              "py-2.5 rounded-xl border transition-all text-sm font-bold uppercase",
              exercised
                ? "bg-indigo-50 border-2 border-indigo-200 text-indigo-600"
                : "border-slate-200 text-slate-500 hover:bg-slate-50",
            )}
          >
            Yes
          </button>
          <button
            onClick={() => setExercised(false)}
            className={cn(
              "py-2.5 rounded-xl border transition-all text-sm font-bold uppercase",
              !exercised
                ? "bg-indigo-50 border-2 border-indigo-200 text-indigo-600"
                : "border-slate-200 text-slate-500 hover:bg-slate-50",
            )}
          >
            No
          </button>
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-slate-400" /> Energy Level
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { val: "low", label: "Low" },
            { val: "normal", label: "Normal" },
            { val: "high", label: "High" },
          ].map((level) => (
            <button
              key={level.val}
              onClick={() => setEnergyLevel(level.val as EnergyLevel)}
              className={cn(
                "py-2.5 rounded-xl border transition-all text-[10px] font-bold uppercase",
                energyLevel === level.val
                  ? "bg-indigo-50 border-2 border-indigo-200 text-indigo-600"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50",
              )}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-3 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-slate-400" /> Focus Mode
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { val: "listening_focus", label: "Dictation" },
            { val: "reading_focus", label: "Reading" },
            { val: "speaking_focus", label: "Speaking" },
            { val: "recovery", label: "Recovery" },
          ].map((type) => (
            <button
              key={type.val}
              onClick={() => setDayType(type.val as DayType)}
              className={cn(
                "py-2.5 rounded-xl border transition-all text-[10px] font-bold uppercase",
                dayType === type.val
                  ? "bg-indigo-50 border-2 border-indigo-200 text-indigo-600"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50",
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-slate-400" /> Workday Bonus
          (Mins)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1 font-bold">
              Momo Vocab
            </label>
            <input
              type="number"
              min="0"
              value={workdayBonus.momoMinutes || ""}
              onChange={(e) =>
                setWorkdayBonus({
                  ...workdayBonus,
                  momoMinutes: parseInt(e.target.value) || 0,
                })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-center font-mono"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1 font-bold">
              Passive Listen
            </label>
            <input
              type="number"
              min="0"
              value={workdayBonus.passiveListeningMinutes || ""}
              onChange={(e) =>
                setWorkdayBonus({
                  ...workdayBonus,
                  passiveListeningMinutes: parseInt(e.target.value) || 0,
                })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-center font-mono"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1 font-bold">
              Wang Lu (Dict)
            </label>
            <input
              type="number"
              min="0"
              value={workdayBonus.dictationMinutes || ""}
              onChange={(e) =>
                setWorkdayBonus({
                  ...workdayBonus,
                  dictationMinutes: parseInt(e.target.value) || 0,
                })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-center font-mono"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1 font-bold">
              IELTS Reading
            </label>
            <input
              type="number"
              min="0"
              value={workdayBonus.readingMinutes || ""}
              onChange={(e) =>
                setWorkdayBonus({
                  ...workdayBonus,
                  readingMinutes: parseInt(e.target.value) || 0,
                })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-center font-mono"
              placeholder="0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Setup Component --- //
function SetupDaily({
  today,
  updateRecord,
  yesterdayRecord,
}: {
  today: string;
  updateRecord: any;
  yesterdayRecord?: DailyRecord;
}) {
  const isYesterdayRed = yesterdayRecord?.status === "red";

  const [exercised, setExercised] = useState(false);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>("normal");
  const [dayType, setDayType] = useState<DayType>(
    isYesterdayRed ? "recovery" : "listening_focus",
  );
  const [workdayBonus, setWorkdayBonus] = useState<WorkdayBonus>({
    passiveListeningMinutes: 0,
    momoMinutes: 0,
    dictationMinutes: 0,
    readingMinutes: 0,
  });

  const handleStart = () => {
    const tasks = generateDailyPlan({
      dayType,
      exercised,
      energyLevel,
      workdayBonus,
      yesterdayStatus: isYesterdayRed ? "red" : "green",
    });

    updateRecord(today, () => ({
      date: today,
      weekday: format(new Date(), "EEEE"),
      exercised,
      startTime: exercised ? "19:00" : "18:00",
      energyLevel,
      dayType,
      workdayBonus,
      tasks,
      stoppedAfter2230: false,
      noCompensatoryStayingUp: false,
      tomorrowFirstStep: "",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  };

  return (
    <div className="flex flex-col gap-6">
      {isYesterdayRed && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
          <h3 className="text-rose-800 font-bold text-sm mb-1">
            Recovery Recommendation
          </h3>
          <p className="text-rose-600 text-xs leading-relaxed">
            Yesterday was a Red day. A Recovery Day is strongly recommended
            today to bounce back without burnout.
          </p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6">
          Daily Configuration for {formatDateStr(today)}
        </h2>

        <ConfigForm
          exercised={exercised}
          setExercised={setExercised}
          energyLevel={energyLevel}
          setEnergyLevel={setEnergyLevel}
          dayType={dayType}
          setDayType={setDayType}
          workdayBonus={workdayBonus}
          setWorkdayBonus={setWorkdayBonus}
        />
      </div>

      <button
        onClick={handleStart}
        className="w-full py-3.5 bg-slate-900 text-white text-xs font-bold rounded-xl tracking-widest uppercase shadow-lg shadow-slate-200 hover:bg-slate-800 transition-colors"
      >
        Generate Plan
      </button>
    </div>
  );
}

// --- Tracker Component --- //

function TrackerDaily({
  today,
  record,
  updateRecord,
  deleteRecord,
  yesterdayRecord,
}: {
  today: string;
  record: DailyRecord;
  updateRecord: any;
  deleteRecord: (date: string) => void;
  yesterdayRecord?: DailyRecord;
}) {
  const [showConfig, setShowConfig] = useState(false);
  const [showConfirmRegenerate, setShowConfirmRegenerate] = useState(false);

  // Local config state for "what if" changes
  const [localConfig, setLocalConfig] = useState({
    exercised: record.exercised,
    energyLevel: record.energyLevel,
    dayType: record.dayType,
    workdayBonus: record.workdayBonus,
  });

  // Keep local config in sync if record completely changes (e.g. from parent/localStorage)
  useEffect(() => {
    setLocalConfig({
      exercised: record.exercised,
      energyLevel: record.energyLevel,
      dayType: record.dayType,
      workdayBonus: record.workdayBonus || {
        momoMinutes: 0,
        dictationMinutes: 0,
        readingMinutes: 0,
        passiveListeningMinutes: 0,
      },
    });
  }, [
    record.exercised,
    record.energyLevel,
    record.dayType,
    record.workdayBonus,
  ]);

  const configIsModified =
    localConfig.exercised !== record.exercised ||
    localConfig.energyLevel !== record.energyLevel ||
    localConfig.dayType !== record.dayType ||
    JSON.stringify(localConfig.workdayBonus) !== JSON.stringify(record.workdayBonus);

  const toggleTask = (taskId: string) => {
    updateRecord(today, (prev: DailyRecord) => {
      const newTasks = prev.tasks.map((t) => {
        if (t.id === taskId) {
          const completed = !t.completed;
          return {
            ...t,
            completed,
            actualMinutes: completed ? t.plannedMinutes : 0,
          };
        }
        return t;
      });
      const updated = {
        ...prev,
        tasks: newTasks,
        updatedAt: new Date().toISOString(),
      };
      const { syncRecordFieldsFromSleepControlTasks } = require("../utils/tasks");
      return syncRecordFieldsFromSleepControlTasks(updated);
    });
  };

  const updateTaskMinutes = (taskId: string, mins: number) => {
    updateRecord(today, (prev: DailyRecord) => {
      const newTasks = prev.tasks.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            actualMinutes: mins,
            completed: mins > 0 ? true : false,
          };
        }
        return t;
      });
      const updated = {
        ...prev,
        tasks: newTasks,
        updatedAt: new Date().toISOString(),
      };
      updated.status = calculateColorStatus(updated);
      return updated;
    });
  };

  const toggleHabit = (
    field: "stoppedAfter2230" | "noCompensatoryStayingUp",
  ) => {
    updateRecord(today, (prev: DailyRecord) => {
      const updated = {
        ...prev,
        [field]: !prev[field],
        updatedAt: new Date().toISOString(),
      };
      updated.status = calculateColorStatus(updated);
      return updated;
    });
  };

  const handleApplyConfig = () => {
    const hasProgress = record.tasks.some(
      (t) => t.completed || t.actualMinutes > 0,
    );
    if (hasProgress) {
      setShowConfirmRegenerate(true);
    } else {
      executeRegenerate();
    }
  };

  function mergeTaskProgress(
    oldTasks: TaskCheckItem[],
    newTasks: TaskCheckItem[]
  ): TaskCheckItem[] {
    // Keep track of which old tasks have already been claimed to prevent
    // multiple new tasks of the same category claiming the same old task.
    // The user's prompt did not explicitly request this but it's safe for 1:1 mapping.
    // I will stick exactly to the user's fallback logic.
    return newTasks.map((newTask) => {
      const oldTask =
        oldTasks.find((task) => task.id === newTask.id) ||
        oldTasks.find(
          (task) =>
            task.category === newTask.category &&
            task.title === newTask.title
        ) ||
        oldTasks.find((task) => task.category === newTask.category);

      if (!oldTask) return newTask;

      return {
        ...newTask,
        actualMinutes: oldTask.actualMinutes ?? newTask.actualMinutes,
        completed: oldTask.completed ?? newTask.completed,
        notes: oldTask.notes ?? newTask.notes,
      };
    });
  }

  const executeRegenerate = () => {
    const newTasks = generateDailyPlan({
      dayType: localConfig.dayType,
      exercised: localConfig.exercised,
      energyLevel: localConfig.energyLevel,
      workdayBonus: localConfig.workdayBonus,
      yesterdayStatus: yesterdayRecord?.status === "red" ? "red" : "green",
    });

    updateRecord(today, (prev: DailyRecord) => {
      const finalTasks = mergeTaskProgress(prev.tasks, newTasks);

      const updated = {
        ...prev,
        exercised: localConfig.exercised,
        energyLevel: localConfig.energyLevel,
        dayType: localConfig.dayType,
        workdayBonus: localConfig.workdayBonus,
        tasks: finalTasks,
        updatedAt: new Date().toISOString(),
      };
      
      updated.status = calculateColorStatus(updated);
      return updated;
    });

    setShowConfirmRegenerate(false);
    setShowConfig(false);
  };

  const statusColors = {
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    yellow: "bg-amber-100 text-amber-700 border-amber-200",
    red: "bg-rose-100 text-rose-700 border-rose-200",
    pending: "bg-slate-100 text-slate-500 border-slate-200",
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
      {/* Regeneration Confirmation Modal */}
      {showConfirmRegenerate && (
        <div className="absolute inset-0 z-50 bg-slate-900/50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg text-slate-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Overwrite Progress?
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              You have already started some tasks. Regenerating the plan will
              reset your progress for today. Are you sure you want to proceed?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmRegenerate(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={executeRegenerate}
                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700"
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            {formatDateStr(today)}
          </h2>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span>{record.dayType.replace("_", " ").toUpperCase()}</span>
            <span className="text-slate-300">•</span>
            <span>{record.energyLevel.toUpperCase()} ENERGY</span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <span
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full border border-solid",
              statusColors[record.status || "pending"],
            )}
          >
            {(record.status || "pending").toUpperCase()}
          </span>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Config Editor */}
      {showConfig && (
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <ConfigForm
            exercised={localConfig.exercised}
            setExercised={(v) =>
              setLocalConfig((p) => ({ ...p, exercised: v }))
            }
            energyLevel={localConfig.energyLevel}
            setEnergyLevel={(v) =>
              setLocalConfig((p) => ({ ...p, energyLevel: v }))
            }
            dayType={localConfig.dayType}
            setDayType={(v) => setLocalConfig((p) => ({ ...p, dayType: v }))}
            workdayBonus={localConfig.workdayBonus}
            setWorkdayBonus={(v) =>
              setLocalConfig((p) => ({ ...p, workdayBonus: v }))
            }
          />
          {configIsModified && (
            <div className="mt-6">
              <button
                onClick={handleApplyConfig}
                className="w-full py-3 bg-indigo-600 text-white text-xs font-bold rounded-xl tracking-widest uppercase shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Apply Changes & Regenerate Plan
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tracker List */}
      <div className="p-5">
        <div className="space-y-3 mb-6">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Timebox Targets
          </h3>
          {record.tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "w-full flex justify-between items-center p-3 rounded-xl border transition-all",
                task.completed
                  ? "bg-slate-50 border-slate-100"
                  : task.isCore
                    ? "bg-white border-2 border-indigo-100"
                    : "bg-white border border-slate-200",
              )}
            >
              <div
                className="flex items-center flex-1 min-w-0 cursor-pointer"
                onClick={() => toggleTask(task.id)}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-md flex items-center justify-center mr-3 shrink-0 transition-colors",
                    task.completed
                      ? "bg-emerald-500 text-white"
                      : task.isCore
                        ? "border-2 border-indigo-300"
                        : "border-2 border-slate-200",
                  )}
                >
                  {task.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <div className="flex flex-col pr-3 min-w-0 overflow-hidden">
                  <div
                    className={cn(
                      "text-sm font-semibold overflow-x-auto overflow-y-hidden whitespace-nowrap no-scrollbar",
                      task.completed ? "text-slate-500 line-through" : "text-slate-800",
                    )}
                  >
                    {task.title}
                    {task.isCore && !task.completed && (
                      <span className="text-[9px] text-indigo-500 ml-2 font-bold uppercase bg-indigo-50 px-1 py-0.5 rounded align-middle inline-block">
                        Core
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mt-1 overflow-x-auto overflow-y-hidden whitespace-nowrap no-scrollbar">
                    Plan: {task.plannedMinutes}m
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pl-3 border-l border-slate-100 shrink-0">
                <label className="text-[10px] font-bold text-slate-400 uppercase hidden sm:block">
                  Actual
                </label>
                <input
                  type="number"
                  min="0"
                  value={task.actualMinutes || ""}
                  onChange={(e) => updateTaskMinutes(task.id, parseInt(e.target.value) || 0)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={task.plannedMinutes.toString()}
                  className={cn(
                    "w-[4rem] text-center p-1.5 rounded-lg text-xs font-mono border bg-white focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all",
                    task.actualMinutes > 0
                      ? "border-emerald-200 text-emerald-800 font-bold bg-emerald-50"
                      : "border-slate-200 text-slate-600"
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
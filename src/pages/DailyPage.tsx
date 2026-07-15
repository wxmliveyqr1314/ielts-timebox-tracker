import { useState, useEffect } from "react";
import {
  DailyRecord,
  DayType,
  DayContext,
  EnergyLevel,
  StretchStrategy,
  WorkdayBonus,
  DailyPlanInput,
} from "../types";
import { getTodayStr, formatDateStr } from "../utils/date";
import { calculateColorStatus } from "../utils/status";
import { buildDailyPlan, getDefaultFocusedMinutes } from "../planning/planEngine";
import { mergePlanProgress, previewPlanDifference } from "../planning/planProgress";
import { getRecommendedFocusMode } from "../utils/focusRecommendation";
import {
  CheckCircle2,
  Dumbbell,
  Zap,
  CheckSquare,
  Settings2,
  Trash2,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import { syncRecordFieldsFromSleepControlTasks } from "../utils/sleepControl";
import { PlanSummary } from "../components/daily/PlanSummary";
import { PlanSections } from "../components/daily/PlanSections";
import { RegenerationPreview } from "../components/daily/RegenerationPreview";

interface DailyPageProps {
  appData: any; // ReturnType of useAppData
}

interface EditablePlanConfig {
  dayContext: DayContext;
  exercised: boolean;
  energyLevel: EnergyLevel;
  dayType: DayType;
  workdayBonus: WorkdayBonus;
  availableFocusedMinutes?: number;
  stretchEnabled: boolean;
  stretchStrategy: StretchStrategy;
}

export function DailyPage({ appData }: DailyPageProps) {
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const today = getTodayStr();
  const record: DailyRecord | undefined = appData.data.records[today];

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

  return (
    <div className="space-y-4">
      {deleteMessage && (
        <div className="p-3 bg-slate-800 text-white text-xs rounded-xl flex items-center justify-between">
          <span className="flex-1 min-w-0 pr-2 break-words">{deleteMessage}</span>
          <button onClick={() => setDeleteMessage(null)} className="text-slate-400 hover:text-white shrink-0 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {!record ? (
        <SetupDaily
          today={today}
          updateRecord={appData.updateRecord}
          records={appData.data.records}
        />
      ) : (
        <TrackerDaily
          today={today}
          record={record}
          updateRecord={appData.updateRecord}
          deleteRecord={handleDelete}
        />
      )}
    </div>
  );
}

// --- Shared Config Form --- //
function ConfigForm({
  dayContext,
  setDayContext,
  exercised,
  setExercised,
  energyLevel,
  setEnergyLevel,
  dayType,
  setDayType,
  workdayBonus,
  setWorkdayBonus,
  availableFocusedMinutes,
  setAvailableFocusedMinutes,
}: {
  dayContext: DayContext;
  setDayContext: (value: DayContext) => void;
  exercised: boolean;
  setExercised: (v: boolean) => void;
  energyLevel: EnergyLevel;
  setEnergyLevel: (v: EnergyLevel) => void;
  dayType: DayType;
  setDayType: (v: DayType) => void;
  workdayBonus: WorkdayBonus;
  setWorkdayBonus: (v: WorkdayBonus) => void;
  availableFocusedMinutes?: number;
  setAvailableFocusedMinutes: (value?: number) => void;
}) {
  const defaultFocusedMinutes = getDefaultFocusedMinutes(dayContext, exercised);

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-3 block text-sm font-semibold text-slate-700">
          Day context
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "workday" as const, label: "Workday" },
            { value: "rest_day" as const, label: "Rest day" },
          ].map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => setDayContext(option.value)}
              className={cn(
                "rounded-xl border py-2.5 text-sm font-bold transition-all",
                dayContext === option.value
                  ? "border-2 border-indigo-200 bg-indigo-50 text-indigo-600"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

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
          <CheckCircle2 className="w-4 h-4 text-slate-400" />
          {dayContext === "workday" ? "Completed during workday" : "Completed earlier today"}
        </label>
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          Enter minutes already completed before generating this plan. Matching focused work reduces tonight's target.
        </p>
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
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1 font-bold">
              Speaking
            </label>
            <input
              aria-label="Speaking bonus minutes"
              type="number"
              min="0"
              value={workdayBonus.speakingMinutes || ""}
              onChange={(e) =>
                setWorkdayBonus({
                  ...workdayBonus,
                  speakingMinutes: parseInt(e.target.value) || 0,
                })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-center font-mono"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="available-focused-minutes" className="block text-sm font-semibold text-slate-700">
          Focused minutes available tonight
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Optional. Leave blank to use the default: {defaultFocusedMinutes} minutes.
        </p>
        <input
          id="available-focused-minutes"
          type="number"
          min="0"
          max="480"
          value={availableFocusedMinutes ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            setAvailableFocusedMinutes(value === "" ? undefined : Number.parseInt(value, 10));
          }}
          placeholder={String(defaultFocusedMinutes)}
          className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-center font-mono text-sm"
        />
      </div>
    </div>
  );
}

// --- Setup Component --- //
function SetupDaily({
  today,
  updateRecord,
  records,
}: {
  today: string;
  updateRecord: any;
  records: Record<string, DailyRecord>;
}) {
  const [recommendation] = useState(() => getRecommendedFocusMode(records, today));

  const [dayContext, setDayContext] = useState<DayContext>("workday");
  const [exercised, setExercised] = useState(false);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>("normal");
  const [dayType, setDayType] = useState<DayType>(recommendation.recommendedMode);
  const [availableFocusedMinutes, setAvailableFocusedMinutes] = useState<number | undefined>();
  const [workdayBonus, setWorkdayBonus] = useState<WorkdayBonus>({
    passiveListeningMinutes: 0,
    momoMinutes: 0,
    dictationMinutes: 0,
    readingMinutes: 0,
    speakingMinutes: 0,
  });

  const handleStart = () => {
    const input: DailyPlanInput = {
      dayType,
      exercised,
      energyLevel,
      dayContext,
      workdayBonus,
      ...(availableFocusedMinutes !== undefined ? { availableFocusedMinutes } : {}),
    };
    const result = buildDailyPlan(input);
    const now = new Date().toISOString();

    updateRecord(today, () => ({
      date: today,
      weekday: format(new Date(), "EEEE"),
      exercised,
      startTime: exercised ? "19:00" : "18:00",
      energyLevel,
      dayType,
      dayContext,
      ...(availableFocusedMinutes !== undefined ? { availableFocusedMinutes } : {}),
      workdayBonus,
      tasks: result.tasks,
      stoppedAfter2230: false,
      noCompensatoryStayingUp: false,
      tomorrowFirstStep: "",
      status: "pending",
      createdAt: now,
      updatedAt: now,
      planSnapshot: { ...result.snapshot, generatedAt: now },
    }));
  };

  const renderRecommendationBanner = () => {
    let title = "Recommended: ";
    if (recommendation.recommendedMode === "listening_focus") title += "Dictation";
    else if (recommendation.recommendedMode === "reading_focus") title += "Reading";
    else if (recommendation.recommendedMode === "speaking_focus") title += "Speaking";
    else title += "Recovery";

    let desc = "";
    switch (recommendation.reason) {
      case "first_day":
        desc = "Welcome! Starting with a Dictation day is recommended.";
        break;
      case "advance_after_green":
        desc = "Yesterday's focus was Green, so today's focus advances.";
        break;
      case "recovery_after_non_green":
        desc = "Yesterday was not completed as Green, so today uses a Recovery plan.";
        break;
      case "continue_recovery":
        desc = "Yesterday's Recovery was not Green, so we continue Recovery today.";
        break;
      case "resume_after_recovery":
        desc = "Recovery was successful! Resuming the previous normal focus mode.";
        break;
      case "missing_previous_day":
        desc = "Missing recent records. Let's do a Recovery day to get back on track.";
        break;
    }

    return (
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 shadow-sm">
        <h3 className="text-indigo-800 font-bold text-sm mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          {title}
        </h3>
        <p className={`text-indigo-600 text-xs leading-relaxed ${recommendation.basedOnDate ? 'mb-3' : ''}`}>
          {desc}
        </p>
        {recommendation.basedOnDate && (
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] bg-indigo-100/80 text-indigo-700 px-2 py-1 rounded-md font-bold tracking-wide">
              {recommendation.basedOnDate}
            </span>
            {recommendation.basedOnStatus && (
              <span className={`text-[10px] px-2 py-1 rounded-md font-bold tracking-wide uppercase ${
                recommendation.basedOnStatus === 'green' ? 'bg-emerald-100 text-emerald-700' :
                recommendation.basedOnStatus === 'yellow' ? 'bg-amber-100 text-amber-700' :
                recommendation.basedOnStatus === 'red' ? 'bg-rose-100 text-rose-700' :
                'bg-slate-200 text-slate-700'
              }`}>
                {recommendation.basedOnStatus}
              </span>
            )}
            {recommendation.basedOnMode && (
              <span className="text-[10px] bg-indigo-100/80 text-indigo-700 px-2 py-1 rounded-md font-bold tracking-wide uppercase">
                {recommendation.basedOnMode.replace('_focus', '')}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {renderRecommendationBanner()}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm wallpaper-surface">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
          Daily Configuration <span className="text-slate-300">/</span> {formatDateStr(today)}
        </h2>

        <ConfigForm
          dayContext={dayContext}
          setDayContext={setDayContext}
          exercised={exercised}
          setExercised={setExercised}
          energyLevel={energyLevel}
          setEnergyLevel={setEnergyLevel}
          dayType={dayType}
          setDayType={setDayType}
          workdayBonus={workdayBonus}
          setWorkdayBonus={setWorkdayBonus}
          availableFocusedMinutes={availableFocusedMinutes}
          setAvailableFocusedMinutes={setAvailableFocusedMinutes}
        />
      </div>

      <button
        onClick={handleStart}
        className="w-full py-3 bg-slate-900 text-white text-sm font-bold rounded-xl tracking-wider shadow-md shadow-slate-200 hover:bg-slate-800 transition-colors"
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
}: {
  today: string;
  record: DailyRecord;
  updateRecord: any;
  deleteRecord: (date: string) => void;
}) {
  const [showConfig, setShowConfig] = useState(false);
  const [showConfirmRegenerate, setShowConfirmRegenerate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Local config state for "what if" changes
  const [localConfig, setLocalConfig] = useState<EditablePlanConfig>({
    dayContext: record.dayContext ?? "workday" as DayContext,
    exercised: record.exercised,
    energyLevel: record.energyLevel,
    dayType: record.dayType,
    workdayBonus: record.workdayBonus,
    availableFocusedMinutes: record.availableFocusedMinutes,
    stretchEnabled: Boolean(record.planSnapshot?.stretch?.enabled),
    stretchStrategy:
      record.planSnapshot?.stretch?.strategy ?? "same_focus",
  });

  // Keep local config in sync if record completely changes (e.g. from parent/localStorage)
  useEffect(() => {
    setLocalConfig({
      dayContext: record.dayContext ?? "workday",
      exercised: record.exercised,
      energyLevel: record.energyLevel,
      dayType: record.dayType,
      workdayBonus: record.workdayBonus || {
        momoMinutes: 0,
        dictationMinutes: 0,
        readingMinutes: 0,
        passiveListeningMinutes: 0,
        speakingMinutes: 0,
      },
      availableFocusedMinutes: record.availableFocusedMinutes,
      stretchEnabled: Boolean(record.planSnapshot?.stretch?.enabled),
      stretchStrategy:
        record.planSnapshot?.stretch?.strategy ?? "same_focus",
    });
  }, [
    record.dayContext,
    record.exercised,
    record.energyLevel,
    record.dayType,
    record.workdayBonus,
    record.availableFocusedMinutes,
    record.planSnapshot?.stretch?.enabled,
    record.planSnapshot?.stretch?.strategy,
  ]);

  const savedStretchEnabled = Boolean(
    record.planSnapshot?.stretch?.enabled,
  );
  const savedStretchStrategy =
    record.planSnapshot?.stretch?.strategy ?? "same_focus";
  const stretchConfigIsModified =
    localConfig.stretchEnabled !== savedStretchEnabled ||
    (localConfig.stretchEnabled &&
      localConfig.stretchStrategy !== savedStretchStrategy);

  const configIsModified =
    localConfig.dayContext !== (record.dayContext ?? "workday") ||
    localConfig.exercised !== record.exercised ||
    localConfig.energyLevel !== record.energyLevel ||
    localConfig.dayType !== record.dayType ||
    localConfig.availableFocusedMinutes !== record.availableFocusedMinutes ||
    stretchConfigIsModified ||
    JSON.stringify(localConfig.workdayBonus) !== JSON.stringify(record.workdayBonus);

  const candidatePlan = buildDailyPlan({
    dayContext: localConfig.dayContext,
    exercised: localConfig.exercised,
    energyLevel: localConfig.energyLevel,
    dayType: localConfig.dayType,
    workdayBonus: localConfig.workdayBonus,
    stretchEnabled: localConfig.stretchEnabled,
    stretchStrategy: localConfig.stretchStrategy,
    ...(localConfig.availableFocusedMinutes !== undefined
      ? { availableFocusedMinutes: localConfig.availableFocusedMinutes }
      : {}),
  });
  const pendingDifference = previewPlanDifference(record.tasks, candidatePlan.tasks);
  const unusedFocusedCapacity = Math.max(
    0,
    candidatePlan.snapshot.summary.capacityMinutes -
      candidatePlan.snapshot.summary.energyAdjustedCoreMinutes,
  );

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
      const synced = syncRecordFieldsFromSleepControlTasks(updated);
      return { ...synced, status: calculateColorStatus(synced) };
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
      const synced = syncRecordFieldsFromSleepControlTasks(updated);
      return { ...synced, status: calculateColorStatus(synced) };
    });
  };

  const handleApplyConfig = () => {
    setShowConfirmRegenerate(true);
  };

  const executeRegenerate = () => {
    updateRecord(today, (prev: DailyRecord) => {
      const now = new Date().toISOString();
      const finalTasks = mergePlanProgress(prev.tasks, candidatePlan.tasks);

      const updated = {
        ...prev,
        dayContext: localConfig.dayContext,
        exercised: localConfig.exercised,
        energyLevel: localConfig.energyLevel,
        dayType: localConfig.dayType,
        workdayBonus: localConfig.workdayBonus,
        ...(localConfig.availableFocusedMinutes !== undefined
          ? { availableFocusedMinutes: localConfig.availableFocusedMinutes }
          : { availableFocusedMinutes: undefined }),
        tasks: finalTasks,
        updatedAt: now,
        planSnapshot: { ...candidatePlan.snapshot, generatedAt: now },
      };

      return { ...updated, status: calculateColorStatus(updated) };
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
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden wallpaper-surface">
      {showConfirmRegenerate && (
        <RegenerationPreview
          difference={pendingDifference}
          onCancel={() => setShowConfirmRegenerate(false)}
          onConfirm={executeRegenerate}
        />
      )}

      {/* Header Info */}
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            {formatDateStr(today)}
          </h2>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span>{record.dayType === 'listening_focus' ? 'Dictation' : record.dayType === 'reading_focus' ? 'Reading' : record.dayType === 'speaking_focus' ? 'Speaking' : 'Recovery'}</span>
            <span className="text-slate-300">/</span>
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
            aria-label="Edit plan inputs"
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
            dayContext={localConfig.dayContext}
            setDayContext={(value) => setLocalConfig((previous) => ({ ...previous, dayContext: value }))}
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
            availableFocusedMinutes={localConfig.availableFocusedMinutes}
            setAvailableFocusedMinutes={(value) =>
              setLocalConfig((previous) => ({ ...previous, availableFocusedMinutes: value }))
            }
          />
          {configIsModified && (
            <div className="mt-6">
              <button
                onClick={handleApplyConfig}
                className="w-full py-3 bg-indigo-600 text-white text-xs font-bold rounded-xl tracking-widest uppercase shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                Preview regenerated plan
              </button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6 p-5">
        {record.planSnapshot && <PlanSummary snapshot={record.planSnapshot} />}
        {record.planSnapshot && (
          <section className="wallpaper-surface rounded-xl border border-indigo-100 bg-indigo-50/75 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-800">
                  Optional stretch
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Unused focused capacity: {unusedFocusedCapacity}m. Optional
                  work does not affect today's color status.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={localConfig.stretchEnabled}
                aria-label={
                  localConfig.stretchEnabled
                    ? "Disable optional stretch"
                    : unusedFocusedCapacity > 0
                      ? "Add optional stretch"
                      : "No stretch capacity"
                }
                disabled={unusedFocusedCapacity === 0 && !localConfig.stretchEnabled}
                onClick={() =>
                  setLocalConfig((previous) => ({
                    ...previous,
                    stretchEnabled: !previous.stretchEnabled,
                  }))
                }
                className={cn(
                  "relative mt-0.5 h-7 w-12 shrink-0 rounded-full border transition-colors",
                  localConfig.stretchEnabled
                    ? "border-indigo-600 bg-indigo-600"
                    : "border-slate-300 bg-slate-200",
                  unusedFocusedCapacity === 0 &&
                    !localConfig.stretchEnabled &&
                    "cursor-not-allowed opacity-50",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                    localConfig.stretchEnabled
                      ? "translate-x-5"
                      : "translate-x-0.5",
                  )}
                />
              </button>
            </div>

            {localConfig.stretchEnabled && (
              <div className="mt-4">
                <div
                  role="group"
                  className="grid grid-cols-2 gap-2"
                  aria-label="Stretch strategy"
                >
                  {(["same_focus", "balanced"] as const).map((strategy) => {
                    const selected = localConfig.stretchStrategy === strategy;
                    return (
                      <button
                        key={strategy}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          setLocalConfig((previous) => ({
                            ...previous,
                            stretchStrategy: strategy,
                          }))
                        }
                        className={cn(
                          "rounded-lg border px-3 py-2 text-xs font-bold transition-colors",
                          selected
                            ? "border-indigo-500 bg-indigo-100 text-indigo-700"
                            : "border-slate-200 bg-white/80 text-slate-600",
                        )}
                      >
                        {strategy === "same_focus" ? "Same Focus" : "Balanced"}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[10px] font-semibold text-indigo-500">
                  No penalty if skipped. Confirm changes before rebuilding the plan.
                </p>
              </div>
            )}

            {stretchConfigIsModified && (
              <button
                type="button"
                onClick={handleApplyConfig}
                className="mt-4 w-full rounded-lg bg-slate-900 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-800"
              >
                Preview stretch changes
              </button>
            )}
          </section>
        )}
        <PlanSections
          dayContext={record.dayContext ?? "workday"}
          workdayBonus={record.workdayBonus}
          tasks={record.tasks}
          onToggleTask={toggleTask}
          onUpdateMinutes={updateTaskMinutes}
        />
      </div>
      {/* Delete Record Section */}
      <div className="p-5 border-t border-slate-100 flex justify-end">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-xs text-rose-300 hover:text-rose-500 flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Today Record
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg text-slate-800 mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" />
              Delete Record?
            </h3>
            <div className="text-sm text-slate-500 mb-6 space-y-2">
              <p>This will delete your local record for today.</p>
              <p>If you use cloud sync, the deletion will be synced to the cloud on your next 'Sync now'.</p>
              <p>Consider exporting a JSON backup in Settings first.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteRecord(today);
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-200 hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

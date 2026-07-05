import { CheckCircle2 } from "lucide-react";
import { cn } from "../../lib/utils";
import type { DayContext, TaskCheckItem, WorkdayBonus } from "../../types";

interface PlanSectionsProps {
  dayContext: DayContext;
  workdayBonus: WorkdayBonus;
  tasks: TaskCheckItem[];
  onToggleTask: (taskId: string) => void;
  onUpdateMinutes: (taskId: string, minutes: number) => void;
}

const BONUS_ROWS: Array<{
  key: keyof WorkdayBonus;
  label: string;
}> = [
  { key: "momoMinutes", label: "Momo vocabulary" },
  { key: "dictationMinutes", label: "Dictation" },
  { key: "readingMinutes", label: "IELTS reading" },
  { key: "passiveListeningMinutes", label: "Passive listening" },
];

function TaskRow({
  task,
  onToggleTask,
  onUpdateMinutes,
}: {
  key?: string;
  task: TaskCheckItem;
  onToggleTask: (taskId: string) => void;
  onUpdateMinutes: (taskId: string, minutes: number) => void;
}) {
  const isControl = task.capacityKind === "control" || task.category === "sleep_control";

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between rounded-xl border p-3 wallpaper-surface",
        task.completed
          ? "border-slate-100 bg-slate-50"
          : task.statusRole === "required"
            ? "border-2 border-indigo-100 bg-white"
            : "border-slate-200 bg-white",
      )}
    >
      <button
        type="button"
        onClick={() => onToggleTask(task.id)}
        aria-label={`${task.completed ? "Mark incomplete" : "Mark complete"}: ${task.title}`}
        className="flex min-w-0 flex-1 items-center text-left"
      >
        <span
          className={cn(
            "mr-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
            task.completed
              ? "bg-emerald-500 text-white"
              : task.statusRole === "required"
                ? "border-2 border-indigo-300"
                : "border-2 border-slate-200",
          )}
        >
          {task.completed && <CheckCircle2 className="h-3.5 w-3.5" />}
        </span>
        <span className="min-w-0 flex-1 pr-3">
          <span className={cn("block break-words text-sm font-semibold leading-tight", task.completed ? "text-slate-500 line-through" : "text-slate-800")}>{task.title}</span>
          <span className="mt-1 block text-[10px] font-bold uppercase text-slate-400">
            {task.carriedForward ? "Earlier progress" : `Plan: ${task.plannedMinutes}m`}
          </span>
        </span>
      </button>

      <div className="shrink-0 border-l border-slate-100 pl-3">
        {isControl ? (
          <span className="block w-16 text-center font-mono text-xs text-slate-300">--</span>
        ) : (
          <input
            aria-label={`Actual minutes for ${task.title}`}
            type="number"
            min="0"
            value={task.actualMinutes || ""}
            placeholder={String(task.plannedMinutes)}
            onChange={(event) => onUpdateMinutes(task.id, Number.parseInt(event.target.value, 10) || 0)}
            className={cn(
              "w-16 rounded-lg border p-1.5 text-center font-mono text-xs focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100",
              task.actualMinutes > 0
                ? "border-emerald-200 bg-emerald-50 font-bold text-emerald-800"
                : "border-slate-200 bg-white text-slate-600",
            )}
          />
        )}
      </div>
    </div>
  );
}

export function PlanSections({
  dayContext,
  workdayBonus,
  tasks,
  onToggleTask,
  onUpdateMinutes,
}: PlanSectionsProps) {
  const completedEarlier = BONUS_ROWS.flatMap(({ key, label }) => {
    const minutes = workdayBonus[key] ?? 0;
    return minutes > 0 ? [{ key, label, minutes }] : [];
  });
  const focused = tasks.filter(
    (task) =>
      !task.carriedForward &&
      (task.capacityKind === "focused" ||
        task.capacityKind === "anchor" ||
        (!task.capacityKind && task.category !== "sleep_control")),
  );
  const parallel = tasks.filter((task) => !task.carriedForward && task.capacityKind === "parallel");
  const carried = tasks.filter((task) => task.carriedForward);
  const controls = tasks.filter((task) => !task.carriedForward && (task.capacityKind === "control" || task.category === "sleep_control"));

  return (
    <div className="space-y-6">
      {completedEarlier.length > 0 && (
        <section aria-label="Completed earlier">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Completed earlier</h3>
          <p className="mt-1 text-xs text-slate-500">
            {dayContext === "workday" ? "Recorded before tonight's plan." : "Recorded earlier today."}
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {completedEarlier.map((row) => (
              <li key={row.key} className="rounded-lg bg-emerald-50/80 px-3 py-2 wallpaper-surface">
                <span className="block text-[10px] font-bold uppercase text-emerald-700">{row.label}</span>
                <span className="mt-1 block font-mono text-sm font-bold text-emerald-900">{row.minutes}m</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {focused.length > 0 && (
        <section aria-label="Tonight focused tasks" className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tonight focused</h3>
          {focused.map((task) => <TaskRow key={task.id} task={task} onToggleTask={onToggleTask} onUpdateMinutes={onUpdateMinutes} />)}
        </section>
      )}

      {parallel.length > 0 && (
        <section aria-label="Parallel tasks" className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Parallel / optional</h3>
          {parallel.map((task) => <TaskRow key={task.id} task={task} onToggleTask={onToggleTask} onUpdateMinutes={onUpdateMinutes} />)}
        </section>
      )}

      {carried.length > 0 && (
        <section aria-label="Earlier progress" className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Earlier progress</h3>
          {carried.map((task) => <TaskRow key={task.id} task={task} onToggleTask={onToggleTask} onUpdateMinutes={onUpdateMinutes} />)}
        </section>
      )}

      {controls.length > 0 && (
        <section aria-label="Day controls" className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Finish well</h3>
          {controls.map((task) => <TaskRow key={task.id} task={task} onToggleTask={onToggleTask} onUpdateMinutes={onUpdateMinutes} />)}
        </section>
      )}
    </div>
  );
}

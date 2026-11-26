import { CheckCircle2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { TASK_REGISTRY } from "../../planning/taskRegistry";
import { formatTaskTitle, localizeTaskDefinition } from "../../i18n/taskCopy";
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
  { key: "momoMinutes", label: "Momo 词汇复习" },
  { key: "dictationMinutes", label: "听写" },
  { key: "readingMinutes", label: "雅思阅读" },
  { key: "speakingMinutes", label: "口语" },
  { key: "passiveListeningMinutes", label: "泛听" },
];

function getTaskGuidance(task: TaskCheckItem) {
  if (!task.definitionId) {
    return undefined;
  }

  const definition = TASK_REGISTRY[task.definitionId];
  return definition ? localizeTaskDefinition(definition) : undefined;
}

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
  const guidance = getTaskGuidance(task);

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
        aria-label={`${task.completed ? "标记为未完成" : "标记为完成"}：${formatTaskTitle(task)}`}
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
          <span className={cn("block break-words text-sm font-semibold leading-tight", task.completed ? "text-slate-500 line-through" : "text-slate-800")}>{formatTaskTitle(task)}</span>
          <span className="mt-1 block text-[10px] font-bold uppercase text-slate-400">
            {task.carriedForward ? "此前已完成" : `计划：${task.plannedMinutes}分钟`}
          </span>
          {guidance?.description && (
            <span className="mt-2 block text-xs leading-relaxed text-slate-500">
              {guidance.description}
            </span>
          )}
          {guidance?.doneCriteria && (
            <span className="mt-1 block text-[10px] font-semibold leading-relaxed text-slate-400">
              完成标准：{guidance.doneCriteria}
            </span>
          )}
        </span>
      </button>

      <div className="shrink-0 border-l border-slate-100 pl-3">
        {isControl ? (
          <span className="block w-16 text-center font-mono text-xs text-slate-300">--</span>
        ) : (
          <input
            aria-label={`${formatTaskTitle(task)}的实际分钟数`}
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
      task.planRole !== "stretch" &&
      (task.capacityKind === "focused" ||
        task.capacityKind === "anchor" ||
        (!task.capacityKind && task.category !== "sleep_control")),
  );
  const stretch = tasks.filter(
    (task) => !task.carriedForward && task.planRole === "stretch",
  );
  const parallel = tasks.filter((task) => !task.carriedForward && task.capacityKind === "parallel");
  const carried = tasks.filter((task) => task.carriedForward);
  const controls = tasks.filter((task) => !task.carriedForward && (task.capacityKind === "control" || task.category === "sleep_control"));

  return (
    <div className="space-y-6">
      {completedEarlier.length > 0 && (
        <section aria-label="提前完成的学习">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">提前完成的学习</h3>
          <p className="mt-1 text-xs text-slate-500">
            {dayContext === "workday" ? "以下学习已在生成今晚计划前完成。" : "以下学习已在今天提前完成。"}
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {completedEarlier.map((row) => (
              <li key={row.key} className="rounded-lg bg-emerald-50/80 px-3 py-2 wallpaper-surface">
                <span className="block text-[10px] font-bold uppercase text-emerald-700">{row.label}</span>
                <span className="mt-1 block font-mono text-sm font-bold text-emerald-900">{row.minutes}分钟</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {focused.length > 0 && (
        <section aria-label="今晚必做任务" className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">今晚必做</h3>
          {focused.map((task) => <TaskRow key={task.id} task={task} onToggleTask={onToggleTask} onUpdateMinutes={onUpdateMinutes} />)}
        </section>
      )}

      {stretch.length > 0 && (
        <section aria-label="可选加练任务" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
              可选加练
            </h3>
            <span className="shrink-0 text-[10px] font-semibold text-slate-400">
              跳过不扣分
            </span>
          </div>
          {stretch.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggleTask={onToggleTask}
              onUpdateMinutes={onUpdateMinutes}
            />
          ))}
        </section>
      )}

      {parallel.length > 0 && (
        <section aria-label="可并行任务" className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">可并行或按需完成</h3>
          {parallel.map((task) => <TaskRow key={task.id} task={task} onToggleTask={onToggleTask} onUpdateMinutes={onUpdateMinutes} />)}
        </section>
      )}

      {carried.length > 0 && (
        <section aria-label="此前已完成" className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">此前已完成</h3>
          {carried.map((task) => <TaskRow key={task.id} task={task} onToggleTask={onToggleTask} onUpdateMinutes={onUpdateMinutes} />)}
        </section>
      )}

      {controls.length > 0 && (
        <section aria-label="当日收尾" className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">收尾与睡眠保护</h3>
          {controls.map((task) => <TaskRow key={task.id} task={task} onToggleTask={onToggleTask} onUpdateMinutes={onUpdateMinutes} />)}
        </section>
      )}
    </div>
  );
}

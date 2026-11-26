import type { ReactNode } from "react";
import { BookOpen, CheckCircle2, ClipboardList, Info } from "lucide-react";
import { TASK_REGISTRY, type TaskDefinition } from "../planning/taskRegistry";
import {
  buildTaskLibraryGroups,
  formatTaskLibraryBadge,
  type TaskLibraryGroup,
} from "../planning/taskLibraryView";
import type { IeltsSkill } from "../types";
import { localizeTaskDefinition } from "../i18n/taskCopy";

const groups = buildTaskLibraryGroups(TASK_REGISTRY);
const tasks = Object.values(TASK_REGISTRY);
const focusedTaskCount = tasks.filter((task) => task.capacityKind === "focused").length;
const rewardTaskCount = tasks.filter((task) => task.rewardEligible).length;

export function StudyPlanPage() {
  return (
    <div className="flex flex-col gap-5 pb-6">
      <section className="wallpaper-surface rounded-lg border border-slate-200 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-lg bg-indigo-500/10 p-2 text-indigo-500">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black tracking-tight text-slate-800">
              学习指南
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              了解每项雅思学习任务的做法与完成标准
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-white/40 text-center">
          <SummaryMetric label="全部任务" value={tasks.length} />
          <SummaryMetric label="专注任务" value={focusedTaskCount} />
          <SummaryMetric label="计分任务" value={rewardTaskCount} />
        </div>

        <p className="mt-4 flex items-start gap-2 text-xs font-medium leading-relaxed text-slate-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
          这里是只读指南，帮助你理解各项任务、具体做法和完成标准。
        </p>
      </section>

      {groups.map((group) => (
        renderTaskGroupSection(group)
      ))}
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-slate-200 px-2 py-3 last:border-r-0">
      <div className="font-mono text-xl font-black text-slate-800">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </div>
    </div>
  );
}

function renderTaskGroupSection(group: TaskLibraryGroup) {
  const headingId = `study-plan-${group.id}`;

  return (
    <section
      key={group.id}
      className="wallpaper-surface rounded-lg border border-slate-200 p-4 shadow-sm"
      aria-labelledby={headingId}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id={headingId}
            className="text-lg font-black tracking-tight text-slate-800"
          >
            {group.title}
          </h2>
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
            {group.description}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100/60 px-2 py-1 font-mono text-[10px] font-bold text-slate-500">
          {group.tasks.length}
        </span>
      </div>

      <div className="space-y-3">
        {group.tasks.map((task) => (
          renderTaskGuideCard(task)
        ))}
      </div>
    </section>
  );
}

function renderTaskGuideCard(definition: Readonly<TaskDefinition>) {
  const task = localizeTaskDefinition(definition);
  return (
    <article key={task.id} className="rounded-lg border border-slate-200 bg-white/35 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-black leading-tight text-slate-800">
            {task.title}
          </h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-indigo-500">
            {formatSkill(task.skill)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          {getTaskBadges(task).map((badge, index) => (
            <span
              key={`${task.id}-${index}`}
              className="rounded-full bg-slate-100/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
        {task.description ?? "暂无任务说明。"}
      </p>

      <div className="mt-3 grid gap-2">
        <GuidanceBlock
          icon={<ClipboardList className="h-4 w-4" />}
          label="具体做法"
          text={task.instruction ?? "按照当天计划，专注完成这项任务。"}
        />
        <GuidanceBlock
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="完成标准"
          text={task.doneCriteria ?? "如实完成计划时长。"}
        />
      </div>
    </article>
  );
}

function GuidanceBlock({
  icon,
  label,
  text,
}: {
  icon: ReactNode;
  label: string;
  text: string;
}) {
  return (
    <div className="flex gap-2 rounded-lg bg-black/5 p-2">
      <div className="mt-0.5 shrink-0 text-indigo-400">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </div>
        <div className="mt-0.5 text-xs font-medium leading-relaxed text-slate-600">
          {text}
        </div>
      </div>
    </div>
  );
}

function getTaskBadges(task: Readonly<TaskDefinition>): string[] {
  return [
    formatTaskLibraryBadge("status", task.statusRole),
    formatTaskLibraryBadge("capacity", task.capacityKind),
    formatTaskLibraryBadge("reward", Boolean(task.rewardEligible)),
    formatTaskLibraryBadge("formal", Boolean(task.formalStudy)),
    ...(task.creditGroup ? [formatTaskLibraryBadge("credit", task.creditGroup)] : []),
  ];
}

function formatSkill(skill?: IeltsSkill): string {
  return ({ listening: "听力", reading: "阅读", speaking: "口语", writing: "写作", vocabulary: "词汇", review: "复习", planning: "计划", sleep: "睡眠" } as Record<string, string>)[skill ?? ""] ?? "通用";
}

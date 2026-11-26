import type { DailyPlanSnapshot } from "../../types";

interface PlanSummaryProps {
  snapshot: DailyPlanSnapshot;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="font-mono text-xs font-bold text-slate-800">{value}</span>
    </div>
  );
}

export function PlanSummary({ snapshot }: PlanSummaryProps) {
  const { summary } = snapshot;
  const passiveMet = summary.passiveReferenceRemainingMinutes === 0;
  const unusedFocusedCapacity = Math.max(
    0,
    summary.capacityMinutes - summary.energyAdjustedCoreMinutes,
  );

  return (
    <section aria-label="计划概览" className="grid gap-3 md:grid-cols-[1fr_0.8fr]">
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 wallpaper-surface">
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          专注学习安排
        </h3>
        <Metric label="可用专注时间" value={`${summary.capacityMinutes}分钟`} />
        <Metric label="当前模式目标" value={`${summary.energyAdjustedCoreMinutes}分钟`} />
        <Metric label="提前完成的学习" value={`-${summary.appliedCoreCreditMinutes}分钟`} />
        <Metric label="剩余可用时间" value={`${unusedFocusedCapacity}分钟`} />
        <div className="mt-2 border-t border-slate-200 pt-2">
          <Metric label="今晚必做" value={`${summary.eveningCoreTargetMinutes}分钟`} />
        </div>
      </div>

      <div className="rounded-xl border border-sky-100 bg-sky-50/80 p-4 wallpaper-surface">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-sky-600">
          泛听参考
        </h3>
        <p className="mt-2 text-sm font-semibold text-slate-800">
          参考时长 {summary.passiveReferenceMinutes}分钟
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {passiveMet
            ? "已达到参考时长，额外泛听按需进行。"
            : `还差 ${summary.passiveReferenceRemainingMinutes}分钟；泛听不会抵扣专注学习。`}
        </p>
      </div>
    </section>
  );
}

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

  return (
    <section aria-label="Plan summary" className="grid gap-3 md:grid-cols-[1fr_0.8fr]">
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 wallpaper-surface">
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Focused plan
        </h3>
        <Metric label="Standard target" value={`${summary.standardCoreMinutes}m`} />
        <Metric label="Energy adjusted" value={`${summary.energyAdjustedCoreMinutes}m`} />
        <Metric label="Completed credit" value={`-${summary.appliedCoreCreditMinutes}m`} />
        <Metric label="Capacity trim" value={`-${summary.capacityTrimmedMinutes}m`} />
        <div className="mt-2 border-t border-slate-200 pt-2">
          <Metric label="Tonight focused" value={`${summary.eveningCoreTargetMinutes}m`} />
        </div>
      </div>

      <div className="rounded-xl border border-sky-100 bg-sky-50/80 p-4 wallpaper-surface">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-sky-600">
          Parallel listening
        </h3>
        <p className="mt-2 text-sm font-semibold text-slate-800">
          {summary.passiveReferenceMinutes}m reference
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {passiveMet
            ? "Reference already met. Extra listening stays optional."
            : `${summary.passiveReferenceRemainingMinutes}m remaining; it does not reduce focused study.`}
        </p>
      </div>
    </section>
  );
}

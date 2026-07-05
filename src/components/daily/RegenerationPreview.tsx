import { AlertTriangle } from "lucide-react";
import type { PlanDifference } from "../../planning/planProgress";

interface RegenerationPreviewProps {
  difference: PlanDifference;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RegenerationPreview({
  difference,
  onCancel,
  onConfirm,
}: RegenerationPreviewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="regeneration-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h3 id="regeneration-title" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Review plan changes
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Actual minutes, completion, and notes will be preserved. Work that no longer matches the new plan moves to Earlier Progress.
        </p>

        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-emerald-50 p-3">
            <dt className="text-[10px] font-bold uppercase text-emerald-700">Added</dt>
            <dd className="mt-1 font-mono font-bold text-emerald-900">{difference.added.length}</dd>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <dt className="text-[10px] font-bold uppercase text-amber-700">Changed</dt>
            <dd className="mt-1 font-mono font-bold text-amber-900">{difference.changed.length}</dd>
          </div>
          <div className="rounded-lg bg-slate-100 p-3">
            <dt className="text-[10px] font-bold uppercase text-slate-600">Carried</dt>
            <dd className="mt-1 font-mono font-bold text-slate-900">{difference.carriedForward.length}</dd>
          </div>
        </dl>

        {difference.changed.length > 0 && (
          <ul className="mt-4 max-h-40 space-y-2 overflow-y-auto text-xs text-slate-600">
            {difference.changed.map((item) => (
              <li key={item.entryId} className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <span className="min-w-0 break-words">{item.title}</span>
                <span className="shrink-0 font-mono">{item.fromMinutes}m → {item.toMinutes}m</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-700">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white">
            Apply regenerated plan
          </button>
        </div>
      </div>
    </div>
  );
}

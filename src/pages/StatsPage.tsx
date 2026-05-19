import { AppState } from "../types";

export function StatsPage({ appData }: { appData: { data: AppState } }) {
  const records = Object.values(appData.data.records);

  const totalDays = records.length;
  const greens = records.filter(
    (r) => r.status === "green" || (r as any).colorStatus === "green",
  ).length;
  const yellows = records.filter(
    (r) => r.status === "yellow" || (r as any).colorStatus === "yellow",
  ).length;
  const reds = records.filter(
    (r) => r.status === "red" || (r as any).colorStatus === "red",
  ).length;

  const totalTasksCompleted = records.reduce((acc, curr) => {
    return (
      acc +
      curr.tasks.filter((t) => t.completed || (t as any).status === "completed")
        .length
    );
  }, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
          Weekly Overview & Stats
        </h2>

        <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
              Tracked Days
            </p>
            <p className="text-2xl font-bold text-slate-800 tracking-tight">
              {totalDays}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
              Tasks Done
            </p>
            <p className="text-2xl font-bold text-indigo-600 tracking-tight">
              {totalTasksCompleted}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex flex-col items-center">
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
              Green
            </p>
            <p className="text-xl font-bold text-emerald-600">{greens}</p>
          </div>
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex flex-col items-center">
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
              Yellow
            </p>
            <p className="text-xl font-bold text-amber-600">{yellows}</p>
          </div>
          <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 flex flex-col items-center">
            <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider mb-1">
              Red
            </p>
            <p className="text-xl font-bold text-rose-600">{reds}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { AppState } from "../types";
import { formatDateStr } from "../utils/date";
import { cn } from "../lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

export function HistoryPage({ appData }: { appData: { data: AppState } }) {
  const records = Object.values(appData.data.records).sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <p>No history yet.</p>
      </div>
    );
  }

  const statusColors = {
    green: "bg-emerald-50 text-emerald-600 border-emerald-200",
    yellow: "bg-amber-50 text-amber-600 border-amber-200",
    red: "bg-rose-50 text-rose-600 border-rose-200",
    untracked: "bg-slate-50 text-slate-500 border-slate-200",
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
          Past Records
        </h2>
        <div className="space-y-3">
          {records.map((record) => {
            const completedTasksCount = record.tasks.filter(
              (t) => t.completed || (t as any).status === "completed",
            ).length;
            const totalTasksCount = record.tasks.length;

            return (
              <div
                key={record.date}
                className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {formatDateStr(record.date)}
                  </p>
                  <p className="text-[10px] font-bold tracking-wider text-slate-400 mt-1 uppercase">
                    {(record.dayType || "normal").replace("_", " ")} •{" "}
                    {completedTasksCount}/{totalTasksCount} Tasks
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    {record.stoppedAfter2230 || (record as any).onTimeStop ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300" />
                    )}
                    <span className="text-[10px] text-slate-500 font-medium">
                      Time
                    </span>
                    <span className="text-slate-300">·</span>
                    {record.noCompensatoryStayingUp ||
                    (record as any).avoidedLateSleep ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300" />
                    )}
                    <span className="text-[10px] text-slate-500 font-medium">
                      Sleep
                    </span>
                  </div>
                </div>
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl border-2 flex items-center justify-center font-bold text-sm",
                    statusColors[record.status || "pending"],
                  )}
                >
                  {(record.status || "pending").charAt(0).toUpperCase()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

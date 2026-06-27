import React from "react";
import { DailyRecord } from "../types";
import { 
  getRecentRecords, 
  getStatusCounts, 
  getCurrentStreak, 
  getLongestStreak, 
  getModuleMinutes, 
  getSleepControlStats, 
  getSpeakingStats 
} from "../utils/stats";
import { Flame, Clock, Mic, Activity, Moon, BookOpen, Headphones, ShieldAlert, Award } from "lucide-react";
import { cn } from "../lib/utils";
import { sortRecordsByDateDesc } from "../utils/date";

export function StatsPage({ appData }: { appData: any }) {
  const allRecords = sortRecordsByDateDesc(
    Object.values(appData.data.records as Record<string, DailyRecord>)
  );

  const recent7 = getRecentRecords(allRecords, 7);
  const statusCounts = getStatusCounts(recent7);
  const { streak, lastRedDate } = getCurrentStreak(allRecords);
  const longestStreak = getLongestStreak(allRecords);
  const moduleMins = getModuleMinutes(recent7);
  const sleepStats = getSleepControlStats(recent7);
  const speakingStats = getSpeakingStats(recent7);

  if (allRecords.length === 0) {
    return (
      <div className="flex flex-col gap-6 pb-6">
        <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <Activity className="w-6 h-6 text-indigo-500" />
          Stats
        </h1>
        <div className="py-20 text-center wallpaper-surface rounded-lg border border-slate-200">
          <Activity className="w-6 h-6 mx-auto text-slate-400 mb-3" />
          <p className="text-sm font-semibold text-slate-600">No stats yet</p>
          <p className="text-xs text-slate-500 mt-1">Complete a day to see your trends.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
        <Activity className="w-6 h-6 text-indigo-500" />
        Stats
      </h1>

      {/* 核心卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-2xl border border-orange-200 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-orange-600 tracking-wider">Current streak</span>
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-orange-600">{streak}</span>
            <span className="text-xs font-bold text-orange-500 pb-1 uppercase">Days</span>
          </div>
          <div className="text-[10px] font-bold text-orange-400 mt-2 uppercase flex items-center gap-1">
            <Award className="w-3 h-3" /> Best: {longestStreak} Days
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-2xl border border-indigo-200 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-indigo-600 tracking-wider">Study time</span>
            <Clock className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-indigo-600">{Math.floor(moduleMins.totalFormal / 60)}</span>
            <span className="text-xs font-bold text-indigo-500 pb-1 uppercase">h</span>
            <span className="text-3xl font-black text-indigo-600 ml-1">{moduleMins.totalFormal % 60}</span>
            <span className="text-xs font-bold text-indigo-500 pb-1 uppercase">m</span>
          </div>
          <div className="text-[10px] font-bold text-indigo-400 mt-2 uppercase">Formal Only</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-2xl border border-emerald-200 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-emerald-600 tracking-wider">Speaking</span>
            <Mic className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-emerald-600">{speakingStats.daysCompleted}</span>
            <span className="text-xs font-bold text-emerald-500 pb-1 uppercase">Days</span>
          </div>
          <div className="text-[10px] font-bold text-emerald-400 mt-2 uppercase">
            Avg {speakingStats.avgMinutes}m / day
          </div>
        </div>
      </div>

      {/* 状态分布 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm wallpaper-surface">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Status distribution</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100 flex flex-col">
            <span className="text-xl font-black text-emerald-600">{statusCounts.green}</span>
            <span className="text-[10px] uppercase font-bold text-emerald-500">Green</span>
          </div>
          <div className="bg-amber-50 p-2 rounded-xl border border-amber-100 flex flex-col">
            <span className="text-xl font-black text-amber-600">{statusCounts.yellow}</span>
            <span className="text-[10px] uppercase font-bold text-amber-500">Yellow</span>
          </div>
          <div className="bg-rose-50 p-2 rounded-xl border border-rose-100 flex flex-col">
            <span className="text-xl font-black text-rose-600">{statusCounts.red}</span>
            <span className="text-[10px] uppercase font-bold text-rose-500">Red</span>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col">
            <span className="text-xl font-black text-slate-500">{statusCounts.pending}</span>
            <span className="text-[10px] uppercase font-bold text-slate-400">Pending</span>
          </div>
        </div>
      </div>

      {/* 模块时长统计 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm wallpaper-surface">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Time by module</h2>
        <div className="space-y-3">
          <StatBar label="Momo" value={moduleMins.totalMomo} max={140} color="bg-indigo-500" icon={<BookOpen className="w-3.5 h-3.5" />} />
          <StatBar label="Dictation" value={moduleMins.totalDictation} max={210} color="bg-sky-500" icon={<Headphones className="w-3.5 h-3.5" />} />
          <StatBar label="Reading" value={moduleMins.totalReading} max={210} color="bg-emerald-500" icon={<BookOpen className="w-3.5 h-3.5" />} />
          <StatBar label="Speaking" value={moduleMins.totalSpeaking} max={210} color="bg-amber-500" icon={<Mic className="w-3.5 h-3.5" />} />
          <StatBar label="Passive Listen" value={moduleMins.totalPassive} max={210} color="bg-slate-400" icon={<Headphones className="w-3.5 h-3.5" />} />
        </div>
      </div>

      {/* 防熬夜统计 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm wallpaper-surface">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <Moon className="w-4 h-4 text-slate-400" /> Sleep control
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Stopped On Time</span>
            <span className="text-lg font-black text-emerald-600">{sleepStats.stoppedOnTime}</span>
          </div>
          <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Late New Task
            </span>
            <span className="text-lg font-black text-rose-600">{sleepStats.lateNewTask}</span>
          </div>
          <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Compensatory Stay Up
            </span>
            <span className="text-lg font-black text-rose-600">{sleepStats.compensatoryStayingUp}</span>
          </div>
        </div>
      </div>

      <div className="text-center text-xs font-semibold text-slate-400 px-4 mt-2">
        "Steady progress, not daily perfection."
      </div>

    </div>
  );
}

function StatBar({ label, value, max, color, icon }: { label: string; value: number; max: number; color: string; icon: React.ReactNode }) {
  const percentage = Math.min(100, (value / max) * 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="text-slate-600 flex items-center gap-1.5">{icon} {label}</span>
        <span className="text-slate-700">{value}m</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-1000 ease-out", color)} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

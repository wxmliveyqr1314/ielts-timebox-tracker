import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppLayout({
  children,
  currentTab,
  onChangeTab,
}: {
  children: ReactNode;
  currentTab: string;
  onChangeTab: (t: string) => void;
}) {
  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans max-w-md mx-auto relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.05)] border-x border-slate-200">
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
            T
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-800">
            TimeBox <span className="text-slate-400 font-normal">Tracker</span>
          </h1>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-5 pb-24">{children}</main>
      <BottomNav currentTab={currentTab} onChangeTab={onChangeTab} />
    </div>
  );
}

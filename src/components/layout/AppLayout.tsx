import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { UseWallpaperResult } from "../../hooks/useWallpaper";

export function AppLayout({
  children,
  currentTab,
  onChangeTab,
  wallpaper,
  online,
}: {
  children: ReactNode;
  currentTab: string;
  onChangeTab: (t: string) => void;
  wallpaper?: UseWallpaperResult;
  online?: boolean;
}) {
  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans max-w-md mx-auto relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.05)] border-x border-slate-200">
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
            T
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-800">
            TimeBox <span className="text-slate-400 font-normal">Tracker</span>
          </h1>
        </div>
      </header>
      <main className="relative flex-1 overflow-hidden">
        {wallpaper?.active && wallpaper?.imageUrl && (
          <div className="fixed-wallpaper-layer absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${wallpaper.imageUrl})` }} />
            <div className="absolute inset-0 bg-slate-950" style={{ opacity: wallpaper.overlayOpacity / 100 }} />
          </div>
        )}
        <div
          className="relative z-10 p-5 h-full overflow-y-auto pb-24"
          data-wallpaper-active={wallpaper?.active ? "true" : "false"}
        >
          {online === false && (
            <div role="status" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              Offline. Local records remain available; cloud actions are paused.
            </div>
          )}
          {children}
        </div>
      </main>
      <BottomNav currentTab={currentTab} onChangeTab={onChangeTab} />
    </div>
  );
}

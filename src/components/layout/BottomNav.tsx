import { BookOpen, Calendar, CheckSquare, BarChart2, Settings } from "lucide-react";
import { cn } from "../../lib/utils";

interface BottomNavProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
}

export function BottomNav({ currentTab, onChangeTab }: BottomNavProps) {
  const tabs = [
    { id: "daily", label: "Daily", icon: CheckSquare },
    { id: "study", label: "Study", icon: BookOpen },
    { id: "history", label: "History", icon: Calendar },
    { id: "stats", label: "Stats", icon: BarChart2 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around z-10">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={cn(
              "min-w-0 flex-1 flex flex-col items-center py-3 px-2 transition-colors",
              isActive
                ? "text-indigo-600"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
            )}
          >
            <Icon className="w-5 h-5 mb-1" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

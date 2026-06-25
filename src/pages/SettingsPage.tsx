import { useRef, ChangeEvent, useState } from "react";
import { AppState } from "../types";
import { Download, Upload, Trash2 } from "lucide-react";
import { APP_VERSION, BUILD_COMMIT, BUILD_TIME } from "../utils/version";
import { format } from "date-fns";

export function SettingsPage({
  appData,
}: {
  appData: {
    data: AppState;
    importData: (data: AppState) => void;
    clearData: () => void;
  };
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = JSON.stringify(appData.data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ielts-timebox-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [showConfirm, setShowConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const parsed = JSON.parse(result) as AppState;
        if (parsed.records) {
          if (window.confirm("此操作会覆盖当前所有本地记录，且无法自动恢复。建议先导出备份。确认继续吗？")) {
            appData.importData(parsed);
            setAlertMessage("Data imported successfully!");
          }
        } else {
          setAlertMessage("Invalid format.");
        }
      } catch (err) {
        setAlertMessage("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClear = () => {
    setShowConfirm(true);
  };

  const confirmClear = () => {
    appData.clearData();
    setShowConfirm(false);
    setAlertMessage("所有数据已清空。 (All data cleared)");
  };

  return (
    <div className="flex flex-col gap-6">
      {alertMessage && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-slate-800 text-white p-4 rounded-xl shadow-lg flex justify-between items-center animate-in fade-in slide-in-from-top-4">
          <p className="text-sm font-medium">{alertMessage}</p>
          <button
            onClick={() => setAlertMessage(null)}
            className="text-slate-400 hover:text-white ml-4"
          >
            ×
          </button>
        </div>
      )}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg text-white mb-2">
              Clear All Data?
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              此操作会删除所有本地打卡记录，且无法恢复。
              <br />
              请确认你已经导出备份。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={confirmClear}
                className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-900/50"
              >
                Clear Data
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-lg">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
          Local-First Backup
        </h2>

        <div className="space-y-4">
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
            <div className="text-xs">
              <p className="font-bold text-white mb-0.5">Local JSON Export</p>
              <p className="text-slate-400">Save progress manually</p>
            </div>
            <button
              onClick={handleExport}
              className="p-3 bg-white/10 hover:bg-white/20 transition-colors rounded-lg"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
            <div className="text-xs">
              <p className="font-bold text-white mb-0.5">Restore from JSON</p>
              <p className="text-slate-400">Overwrite current data</p>
            </div>
            <input
              type="file"
              accept="application/json"
              ref={fileInputRef}
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-white/10 hover:bg-white/20 transition-colors rounded-lg"
            >
              <Upload className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/20 flex justify-between items-center">
            <div className="text-xs">
              <p className="font-bold text-rose-500 mb-0.5">Clear All Data</p>
              <p className="text-rose-500/70">Irreversible action</p>
            </div>
            <button
              onClick={handleClear}
              className="p-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 transition-colors rounded-lg"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          <p className="text-[10px] text-slate-500 italic mt-4">
            Privacy First: Your data stays in your browser's LocalStorage. No
            cookies, no trackers.
          </p>

          <div className="mt-8 pt-4 border-t border-slate-700/50 text-center text-[10px] text-slate-500 font-mono flex flex-col gap-1">
            <p>
              v{APP_VERSION} • {BUILD_COMMIT}
            </p>
            <p>
              {BUILD_TIME !== 'unknown' ? format(new Date(BUILD_TIME), "yyyy-MM-dd HH:mm") : 'unknown build time'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

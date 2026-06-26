import { useRef, ChangeEvent, useState, useEffect } from "react";
import { AppState } from "../types";
import { Download, Upload, Trash2, Cloud, Mail } from "lucide-react";
import { APP_VERSION, BUILD_COMMIT, BUILD_TIME } from "../utils/version";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";
import { format } from "date-fns";
import { syncDailyRecords } from "../utils/cloudSync";
import { supabase } from "../utils/supabaseClient";
import { getOrCreateDeviceId } from "../hooks/useAppData";

function formatDeviceId(id: string | null) {
  if (!id) return "Not prepared yet";
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}

function formatSyncResult(uploaded: number, downloaded: number, skipped: number) {
  if (uploaded === 0 && downloaded === 0) {
    return "Sync complete: no changes.";
  }
  return `Sync complete: ${uploaded} uploaded, ${downloaded} downloaded, ${skipped} already up to date.`;
}

export function SettingsPage({
  appData,
}: {
  appData: {
    data: AppState;
    importData: (data: AppState) => void;
    clearData: () => void;
    replaceData: (data: AppState) => void;
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

  const { session, email, loading, configured, error, sendMagicLink, verifyEmailOtp, signOut } = useSupabaseAuth();
  const [authEmail, setAuthEmail] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [authNotice, setAuthNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const formatAuthError = (err: any) => {
    const msg = err?.message || "";
    if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many requests')) {
      return 'Too many login emails sent. Please wait a few minutes, then try again.';
    }
    return `Login failed. Please try again. (${msg})`;
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleMagicLink = async () => {
    if (!authEmail) return;
    const { error } = await sendMagicLink(authEmail);
    if (error) {
      setAuthNotice({ type: "error", message: formatAuthError(error) });
    } else {
      setAuthNotice({ type: "success", message: "Magic link sent! Check your email." });
      setCooldown(60);
    }
  };

  const handleVerifyOtp = async () => {
    if (!authEmail) return;
    if (!authOtp || authOtp.length !== 6 || !/^\d+$/.test(authOtp)) {
      setAuthNotice({ type: "error", message: "Please enter the 6-digit code from your email." });
      return;
    }
    const { error } = await verifyEmailOtp(authEmail, authOtp);
    if (error) {
      setAuthNotice({ type: "error", message: formatAuthError(error) });
    } else {
      setAuthNotice(null);
      setAuthOtp("");
      setAuthEmail("");
      setCooldown(0);
    }
  };

  const [showConfirm, setShowConfirm] = useState(false);
  const [showFirstSyncConfirm, setShowFirstSyncConfirm] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const handleSync = async () => {
    if (!configured) {
      setSyncResult(`Cloud sync is not configured.`);
      return;
    }
    if (!session?.user?.id || !supabase) {
      setSyncResult(`Please sign in before syncing.`);
      return;
    }

    let deviceId: string;
    try {
      deviceId = getOrCreateDeviceId();
    } catch (e) {
      setSyncResult(`Could not prepare this device for sync.`);
      return;
    }

    if (!session?.user?.id || !supabase) return;

    setIsSyncing(true);
    setSyncResult(null);

    const result = await syncDailyRecords({
      localState: appData.data,
      userId: session.user.id,
      deviceId,
      supabase
    });

    if (result.errors.length > 0) {
      setSyncResult(`Sync failed. Your local data was kept safe. (${result.errors[0]})`);
    } else {
      appData.replaceData(result.mergedState);
      setSyncResult(formatSyncResult(result.uploaded, result.downloaded, result.skipped));
    }

    setIsSyncing(false);
  };

  const getDisplaySyncResult = () => {
    if (syncResult) return syncResult;
    const lsr = appData.data.sync?.lastSyncResult;
    if (!lsr) return "No recent sync result";
    return formatSyncResult(lsr.uploaded, lsr.downloaded, lsr.skipped);
  };

  const triggerSync = () => {
    if (!appData.data.sync?.lastSyncAt) {
      setShowFirstSyncConfirm(true);
    } else {
      handleSync();
    }
  };

  const confirmFirstSync = () => {
    setShowFirstSyncConfirm(false);
    handleSync();
  };

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
      {showFirstSyncConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg text-white mb-2">
              First Cloud Sync
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Please export a local JSON backup first.<br/><br/>
              Cloud sync will merge local and cloud records by date. Newer updatedAt wins.<br/><br/>
              This operation will not automatically clear your local data.<br/><br/>
              Continue?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFirstSyncConfirm(false)}
                className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={confirmFirstSync}
                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/50"
              >
                Continue
              </button>
            </div>
          </div>
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
          Cloud Sync (Phase 1)
        </h2>

        <div className="space-y-4 mb-8">
          {session && error && (
            <div className="p-3 bg-rose-500/10 text-rose-500 text-xs rounded-xl border border-rose-500/20">
              {error}
            </div>
          )}
          {authNotice && (
            <div className={`p-3 text-xs rounded-xl border ${
              authNotice.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}>
              {authNotice.message}
            </div>
          )}

          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-sm">Supabase Auth</span>
              </div>
              <div className="text-xs text-slate-400">
                Status: {loading ? "Signing in..." : (!configured ? "Not configured" : (session ? "Signed in" : "Signed out"))}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mb-4">
              Manual sync is available. Daily records sync only when you tap Sync now.
            </p>

            {!configured ? (
              <div className="text-xs text-rose-400 p-3 bg-rose-400/10 rounded-lg">
                Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
              </div>
            ) : session ? (
              <div className="flex flex-col gap-3">
                <div className="text-sm bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Account</span>
                    <span className="font-mono text-indigo-300 text-xs truncate max-w-[150px]">{email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Local records</span>
                    <span className="font-mono text-slate-300 text-xs">{Object.keys(appData.data.records || {}).length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Device</span>
                    <span className="font-mono text-slate-300 text-xs">{formatDeviceId(localStorage.getItem("ielts_timebox_device_id"))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Mode</span>
                    <span className="font-mono text-emerald-400 text-xs">Manual sync only</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Last sync</span>
                    <span className="font-mono text-slate-300 text-xs">
                      {appData.data.sync?.lastSyncAt ? format(new Date(appData.data.sync.lastSyncAt), "yyyy-MM-dd HH:mm") : 'Never'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
                    <span className="text-xs text-slate-400">Last result</span>
                    <span className="text-[10px] text-indigo-400">
                      {getDisplaySyncResult()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <button
                    onClick={triggerSync}
                    disabled={isSyncing}
                    className="w-full py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-sm font-bold transition-colors"
                  >
                    {isSyncing ? "Syncing..." : "Sync now"}
                  </button>
                  <button
                    onClick={signOut}
                    disabled={loading || isSyncing}
                    className="w-full py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 rounded-lg text-sm font-bold transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <button
                  onClick={handleMagicLink}
                  disabled={loading || !authEmail || cooldown > 0}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {loading ? "Sending..." : cooldown > 0 ? `Send again in ${cooldown}s` : "Send Magic Link"}
                </button>

                <div className="border-t border-white/5 my-1" />

                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="6-digit code (if you didn't click the link)"
                    value={authOtp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setAuthOtp(val);
                    }}
                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-center tracking-widest"
                  />
                </div>
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading || !authEmail || authOtp.length !== 6}
                  className="w-full py-2 bg-emerald-600/80 hover:bg-emerald-500/80 disabled:opacity-50 disabled:hover:bg-emerald-600/80 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
              </div>
            )}
          </div>
        </div>

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

import { useRef, ChangeEvent, useState, useEffect, useMemo } from "react";
import { AppState, RewardGoalDraft } from "../types";
import { Download, Upload, Trash2, Cloud, Mail, Gift } from "lucide-react";
import { APP_VERSION, BUILD_COMMIT, BUILD_TIME } from "../utils/version";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";
import { format } from "date-fns";
import { syncAppData } from "../utils/cloudSync";
import type { RewardSyncStatus } from "../utils/rewardSync";
import { supabase } from "../utils/supabaseClient";
import { getOrCreateDeviceId } from "../hooks/useAppData";
import { analyzeAppDataHealth } from "../utils/dataHealth";
import { WallpaperSettings } from "../components/settings/WallpaperSettings";
import { UseWallpaperResult } from "../hooks/useWallpaper";
import { getAuthErrorMessage } from "../utils/authErrors";
import { formatDataHealthIssue } from "../i18n/feedback";
import { formatDateStr } from "../utils/date";

function formatDeviceId(id: string | null) {
  if (!id) return "尚未准备";
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}

function formatSyncResult(uploaded: number, downloaded: number, skipped: number, rewardStatus?: RewardSyncStatus) {
  const rewardMessage = rewardStatus ? ` 奖励目标${rewardStatus === "uploaded" ? "已上传" : rewardStatus === "downloaded" ? "已下载" : "已是最新"}。` : "";
  if (uploaded === 0 && downloaded === 0) {
    return `学习记录已是最新。${rewardMessage}`;
  }
  return `学习记录：上传 ${uploaded} 条，下载 ${downloaded} 条，${skipped} 条已是最新。${rewardMessage}`;
}

export function SettingsPage({
  appData,
  auth,
  wallpaper,
  online,
}: {
  appData: {
    data: AppState;
    importData: (data: AppState) => void;
    clearData: () => void;
    replaceData: (data: AppState, syncedFrom?: AppState) => void;
    saveRewardGoal: (draft: RewardGoalDraft) => void;
    clearRewardGoal: () => void;
  };
  auth: ReturnType<typeof useSupabaseAuth>;
  wallpaper: UseWallpaperResult;
  online: boolean;
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

  const { session, email, loading, configured, error, sendMagicLink, verifyEmailOtp, signOut } = auth;
  const [authEmail, setAuthEmail] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [authNotice, setAuthNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const healthReport = useMemo(() => analyzeAppDataHealth(appData.data), [appData.data]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleMagicLink = async () => {
    if (!online) {
      setAuthNotice({ type: "error", message: "当前离线，联网后即可使用云账户功能。" });
      return;
    }
    if (!authEmail) return;
    const { error } = await sendMagicLink(authEmail);
    if (error) {
      setAuthNotice({ type: "error", message: getAuthErrorMessage(error) });
    } else {
      setAuthNotice({ type: "success", message: "登录邮件已发送，请查收邮箱。" });
      setCooldown(60);
    }
  };

  const handleVerifyOtp = async () => {
    if (!online) {
      setAuthNotice({ type: "error", message: "当前离线，联网后即可使用云账户功能。" });
      return;
    }
    if (!authEmail) return;
    if (!authOtp || authOtp.length !== 6 || !/^\d+$/.test(authOtp)) {
      setAuthNotice({ type: "error", message: "请输入邮件中的 6 位验证码。" });
      return;
    }
    const { error } = await verifyEmailOtp(authEmail, authOtp);
    if (error) {
      setAuthNotice({ type: "error", message: getAuthErrorMessage(error) });
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
  const activeRewardGoal = appData.data.rewards?.activeGoal;
  const [rewardTitle, setRewardTitle] = useState(activeRewardGoal?.title ?? "");
  const [rewardTargetPoints, setRewardTargetPoints] = useState(
    activeRewardGoal ? String(activeRewardGoal.targetPoints) : "",
  );
  const [rewardNote, setRewardNote] = useState(activeRewardGoal?.note ?? "");
  const [rewardNotice, setRewardNotice] = useState<string | null>(null);
  const rewardDraftDirty = useRef(false);

  useEffect(() => {
    if (rewardDraftDirty.current) {
      setRewardNotice("目标已从云端更新，未保存的输入已保留；保存后请再次同步。");
      return;
    }
    setRewardTitle(activeRewardGoal?.title ?? "");
    setRewardTargetPoints(activeRewardGoal ? String(activeRewardGoal.targetPoints) : "");
    setRewardNote(activeRewardGoal?.note ?? "");
  }, [
    activeRewardGoal?.id,
    activeRewardGoal?.title,
    activeRewardGoal?.targetPoints,
    activeRewardGoal?.note,
  ]);

  const handleSync = async () => {
    if (!online) {
      setSyncResult("当前离线，本地数据已保留，请联网后再同步。");
      return;
    }
    if (!configured) {
      setSyncResult("尚未配置云同步。");
      return;
    }
    if (!session?.user?.id || !supabase) {
      setSyncResult("请先登录，再进行同步。");
      return;
    }

    let deviceId: string;
    try {
      deviceId = getOrCreateDeviceId();
    } catch (e) {
      setSyncResult("无法为此设备准备同步，请检查浏览器存储权限。");
      return;
    }

    if (!session?.user?.id || !supabase) return;

    setIsSyncing(true);
    setSyncResult(null);

    const source = JSON.parse(JSON.stringify(appData.data)) as AppState;
    const result = await syncAppData({
      localState: source,
      userId: session.user.id,
      deviceId,
      supabase
    });

    appData.replaceData(result.mergedState, source);
    const message = result.recordsSucceeded
      ? formatSyncResult(result.uploaded, result.downloaded, result.skipped,
          result.rewardsSucceeded ? result.rewardStatus : undefined)
      : (result.rewardsSucceeded ? "奖励目标同步完成。" : "");
    setSyncResult([message, ...result.errors].filter(Boolean).join(" "));

    setIsSyncing(false);
  };

  const getDisplaySyncResult = () => {
    if (syncResult) return syncResult;
    const lsr = appData.data.sync?.lastSyncResult;
    if (!lsr) return "暂无同步结果";
    return formatSyncResult(lsr.uploaded, lsr.downloaded, lsr.skipped, lsr.rewardStatus);
  };

  const handleSaveRewardGoal = () => {
    const title = rewardTitle.trim();
    const note = rewardNote.trim();
    const targetPoints = Number(rewardTargetPoints);

    if (!title) {
      setRewardNotice("请输入奖励名称。");
      return;
    }
    if (!Number.isFinite(targetPoints) || targetPoints <= 0 || targetPoints > 999) {
      setRewardNotice("目标积分必须大于 0，且不超过 999。");
      return;
    }

    rewardDraftDirty.current = false;
    appData.saveRewardGoal({
      title,
      targetPoints,
      note: note || undefined,
    });
    setRewardNotice("奖励目标已保存在本机，点击“立即同步”可同步到其他设备。");
  };

  const handleClearRewardGoal = () => {
    rewardDraftDirty.current = false;
    appData.clearRewardGoal();
    setRewardTitle("");
    setRewardTargetPoints("");
    setRewardNote("");
    setRewardNotice("奖励目标已在本机清除，点击“立即同步”可同步清除结果。");
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
            setAlertMessage("数据导入成功！");
          }
        } else {
          setAlertMessage("备份文件格式不正确。");
        }
      } catch (err) {
        setAlertMessage("无法读取 JSON 文件，请检查文件是否完整。");
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
    setAlertMessage("所有本地数据已清空。");
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
              首次云同步
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              请先导出一份本地 JSON 备份。<br/><br/>
              同步会按日期合并本地与云端记录，保留修改时间较新的版本。<br/><br/>
              奖励目标也会同步，较新的修改或清除操作优先。<br/><br/>
              是否继续？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFirstSyncConfirm(false)}
                className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl"
              >
                取消
              </button>
              <button
                onClick={confirmFirstSync}
                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/50"
              >
                继续
              </button>
            </div>
          </div>
        </div>
      )}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg text-white mb-2">
              确认清空本地数据？
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
                取消
              </button>
              <button
                onClick={confirmClear}
                className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-900/50"
              >
                清空数据
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-lg border border-white/5 wallpaper-surface-dark">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
          账户与云同步
        </h2>

        <div className="space-y-4 mb-8">
          {error && !authNotice && (
            <div className="p-3 bg-rose-500/10 text-rose-500 text-xs rounded-xl border border-rose-500/20">
              {getAuthErrorMessage(error)}
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
                <span className="font-bold text-sm">邮箱登录</span>
              </div>
              <div className="text-xs text-slate-400">
                状态：{loading ? "登录中…" : (!configured ? "未配置" : (session ? "已登录" : "未登录"))}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mb-4">
              学习记录和奖励目标采用手动同步，请点击“立即同步”上传和下载。
              同步期间继续修改的内容，请在完成后再次同步。
            </p>

            {online === false && (
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-300 mb-4">
                离线时无法使用账户和云同步，本地数据仍可使用。
              </div>
            )}

            {!configured ? (
              <div className="text-xs text-rose-400 p-3 bg-rose-400/10 rounded-lg">
                云登录尚未配置，请联系应用维护者检查连接设置。
              </div>
            ) : session ? (
              <div className="flex flex-col gap-3">
                <div className="text-sm bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs text-slate-400 shrink-0">账户</span>
                    <span className="font-mono text-indigo-300 text-xs min-w-0 flex-1 truncate text-right">{email}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs text-slate-400 shrink-0">本地记录</span>
                    <span className="font-mono text-slate-300 text-xs min-w-0 flex-1 truncate text-right">{Object.keys(appData.data.records || {}).length}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs text-slate-400 shrink-0">当前设备</span>
                    <span className="font-mono text-slate-300 text-xs min-w-0 flex-1 truncate text-right">{formatDeviceId(localStorage.getItem("ielts_timebox_device_id"))}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs text-slate-400 shrink-0">同步方式</span>
                    <span className="font-mono text-emerald-400 text-xs min-w-0 flex-1 truncate text-right">手动同步</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs text-slate-400 shrink-0">上次同步</span>
                    <span className="font-mono text-slate-300 text-xs min-w-0 flex-1 truncate text-right">
                      {appData.data.sync?.lastSyncAt ? format(new Date(appData.data.sync.lastSyncAt), "yyyy-MM-dd HH:mm") : "尚未同步"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
                    <span className="text-xs text-slate-400">最近结果</span>
                    <span className="text-[10px] text-indigo-400 break-words leading-tight">
                      {getDisplaySyncResult()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <button
                    onClick={triggerSync}
                    disabled={isSyncing || !online}
                    className="flex-1 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    {isSyncing ? "同步中…" : "立即同步"}
                  </button>
                  <button
                    onClick={signOut}
                    disabled={loading || isSyncing}
                    className="flex-1 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 rounded-lg text-sm font-bold transition-colors"
                  >
                    退出登录
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="请输入邮箱地址"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <button
                  onClick={handleMagicLink}
                  disabled={loading || !authEmail || cooldown > 0 || !online}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {loading ? "发送中…" : cooldown > 0 ? `${cooldown}秒后可再次发送` : "发送登录邮件"}
                </button>

                <div className="border-t border-white/5 my-1" />

                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="输入邮件中的 6 位验证码"
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
                  disabled={loading || !authEmail || authOtp.length !== 6 || !online}
                  className="w-full py-2 bg-emerald-600/80 hover:bg-emerald-500/80 disabled:opacity-50 disabled:hover:bg-emerald-600/80 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {loading ? "验证中…" : "验证登录"}
                </button>
              </div>
            )}
          </div>
        </div>

        <WallpaperSettings wallpaper={wallpaper} signedIn={!!session} online={online} />

        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 mt-8">
          奖励目标
        </h2>

        <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-lg border border-white/5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-amber-400/10 p-2 text-amber-300">
              <Gift className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">当前奖励</p>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                设定一个奖励目标，统计页会根据每天的完成情况累计积分。
                保存或清除后，点击“立即同步”同步到其他设备。
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <label className="grid gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              奖励名称
              <input
                aria-label="奖励名称"
                value={rewardTitle}
                onChange={(e) => { rewardDraftDirty.current = true; setRewardTitle(e.target.value); }}
                maxLength={60}
                placeholder="吃一顿火锅"
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm normal-case tracking-normal text-white placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
              />
            </label>

            <label className="grid gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              目标积分
              <input
                aria-label="目标积分"
                type="number"
                min="1"
                step="0.1"
                max="999"
                value={rewardTargetPoints}
                onChange={(e) => { rewardDraftDirty.current = true; setRewardTargetPoints(e.target.value); }}
                placeholder="20"
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm normal-case tracking-normal text-white placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
              />
            </label>

            <label className="grid gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              奖励说明
              <textarea
                aria-label="奖励说明"
                value={rewardNote}
                onChange={(e) => { rewardDraftDirty.current = true; setRewardNote(e.target.value); }}
                maxLength={120}
                placeholder="写下这份奖励对你的意义"
                rows={2}
                className="w-full resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm normal-case tracking-normal text-white placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
              />
            </label>
          </div>

          {rewardNotice && (
            <p className="text-[10px] text-amber-300">{rewardNotice}</p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleSaveRewardGoal}
              className="flex-1 rounded-lg bg-amber-400/15 px-4 py-2.5 text-sm font-bold text-amber-300 transition-colors hover:bg-amber-400/25"
            >
              保存奖励目标
            </button>
            {activeRewardGoal && (
              <button
                type="button"
                onClick={handleClearRewardGoal}
                className="flex-1 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:bg-slate-700"
              >
                清除奖励目标
              </button>
            )}
          </div>
        </div>

        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 mt-8">
          数据检查
        </h2>

        <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-lg border border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-bold text-sm">检查结果</span>
            {healthReport.ok ? (
              <span className="text-emerald-400 text-xs font-bold bg-emerald-400/10 px-2.5 py-1 rounded-md">正常</span>
            ) : (
              <span className="text-rose-400 text-xs font-bold bg-rose-400/10 px-2.5 py-1 rounded-md">发现问题</span>
            )}
          </div>

          <div className="flex flex-col gap-1 p-3 bg-black/20 rounded-xl border border-white/5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">记录总数</span>
              <span className="font-mono text-xs text-slate-300">{healthReport.totalRecords}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">错误</span>
              <span className="font-mono text-xs text-rose-400">{healthReport.errors}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">提醒</span>
              <span className="font-mono text-xs text-amber-400">{healthReport.warnings}</span>
            </div>
          </div>

          {healthReport.ok ? (
            <div className="space-y-1 mt-2">
              <p className="text-sm font-medium text-emerald-400">本地记录检查正常。</p>
              <p className="text-[10px] text-slate-500 italic">检查仅用于查看，不会修改数据。</p>
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              <p className="text-[10px] text-amber-500/80 italic leading-tight">检查不会修改数据。手动调整前，请先导出 JSON 备份。</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {healthReport.issues.slice(0, 5).map((issue, idx) => (
                  <div key={idx} className={`p-2.5 rounded-lg border text-[10px] leading-relaxed break-words ${issue.severity === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>
                    <span className="font-bold uppercase tracking-wider">{issue.severity === "error" ? "错误" : "提醒"}</span>：
                    {issue.date && `${formatDateStr(issue.date)}：`}{formatDataHealthIssue(issue)}
                  </div>
                ))}
                {healthReport.issues.length > 5 && (
                  <div className="text-[10px] text-slate-500 italic pl-1">
                    +{healthReport.issues.length - 5} 项其他问题
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 mt-8">
          本地数据与备份
        </h2>

        <div className="space-y-3">
          <div className="p-4 bg-black/20 rounded-xl border border-white/5 flex justify-between items-center gap-4">
            <div className="text-xs">
              <p className="font-bold text-white mb-0.5">导出 JSON 备份</p>
              <p className="text-slate-400">手动保存学习进度</p>
            </div>
            <button
              onClick={handleExport}
              aria-label="导出 JSON 备份"
              className="p-3 bg-white/10 hover:bg-white/20 transition-colors rounded-lg"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 bg-black/20 rounded-xl border border-white/5 flex justify-between items-center gap-4">
            <div className="text-xs">
              <p className="font-bold text-white mb-0.5">从 JSON 恢复</p>
              <p className="text-slate-400">用备份替换当前本地数据</p>
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
              aria-label="从 JSON 恢复"
              className="p-3 bg-white/10 hover:bg-white/20 transition-colors rounded-lg"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/20 flex justify-between items-center gap-4">
            <div className="text-xs">
              <p className="font-bold text-rose-500 mb-0.5">清空本地数据</p>
              <p className="text-rose-500/70">清空后无法自动恢复</p>
            </div>
            <button
              onClick={handleClear}
              aria-label="清空本地数据"
              className="p-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 transition-colors rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[10px] text-slate-500 italic mt-4">
            学习数据优先保存在本机；登录后的云同步由你手动发起。
          </p>

          <div className="mt-10 pt-6 border-t border-slate-700/50 text-center text-[10px] text-slate-500 font-mono flex flex-col gap-1.5 break-all px-4">
            <p>
              v{APP_VERSION} • {BUILD_COMMIT}
            </p>
            <p>
              {BUILD_TIME !== 'unknown' ? format(new Date(BUILD_TIME), "yyyy-MM-dd HH:mm") : "构建时间未知"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from "react";
import { Image, Upload, Eye, Trash2 } from "lucide-react";
import { UseWallpaperResult } from "../../hooks/useWallpaper";

interface WallpaperSettingsProps {
  wallpaper: UseWallpaperResult;
  signedIn: boolean;
  online: boolean;
}

export function WallpaperSettings({ wallpaper, signedIn, online }: WallpaperSettingsProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [localOpacity, setLocalOpacity] = useState(wallpaper.overlayOpacity);
  const opacityTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalOpacity(wallpaper.overlayOpacity);
  }, [wallpaper.overlayOpacity]);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (opacityTimerRef.current) window.clearTimeout(opacityTimerRef.current);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !signedIn || online === false) return;
    const success = await wallpaper.uploadAndApply(selectedFile);
    if (success) {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (online === false) return;
    const val = parseInt(e.target.value, 10);
    setLocalOpacity(val);

    if (opacityTimerRef.current) window.clearTimeout(opacityTimerRef.current);
    opacityTimerRef.current = window.setTimeout(() => {
      wallpaper.setOverlayOpacity(val);
    }, 400);
  };

  const handleRemove = async () => {
    if (online === false) return;
    await wallpaper.remove();
    setShowRemoveDialog(false);
  };

  const isBusy = Boolean(wallpaper.busy);
  const cloudControlsDisabled = isBusy || !signedIn || online === false;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6 wallpaper-surface">
      <div className="flex items-center gap-3 mb-4">
        <Image className="w-5 h-5 text-indigo-500" />
        <h3 className="text-lg font-semibold text-slate-800 wallpaper-heading">Cloud Wallpaper</h3>
      </div>

      {online === false && (
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-500/80 mb-4 font-semibold">
          Wallpaper cloud controls are unavailable offline. Your cached wallpaper remains visible.
        </div>
      )}

      {wallpaper.notice && (
        <div
          role={wallpaper.notice.type === "error" ? "alert" : "status"}
          className={`px-3 py-2 rounded-lg mb-4 text-sm ${
            wallpaper.notice.type === "error" ? "bg-red-50 text-red-700 border border-red-100" :
            wallpaper.notice.type === "warning" ? "bg-amber-50 text-amber-700 border border-amber-100" :
            "bg-green-50 text-green-700 border border-green-100"
          }`}
        >
          {wallpaper.notice.message}
          <button onClick={wallpaper.clearNotice} className="float-right font-bold ml-2">&times;</button>
        </div>
      )}

      {(previewUrl || wallpaper.imageUrl) && (
        <div className="mb-5">
          <div
            className="w-full aspect-video rounded-lg border border-slate-200 overflow-hidden relative"
            style={{ backgroundImage: `url(${previewUrl || wallpaper.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
          >
            <div className="absolute inset-0 bg-slate-950" style={{ opacity: localOpacity / 100 }} />
            {!wallpaper.active && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                <span className="text-slate-800 font-medium px-3 py-1 bg-white/80 rounded-md">Disabled</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={wallpaper.active}
                onChange={(e) => wallpaper.setEnabled(e.target.checked)}
                disabled={cloudControlsDisabled}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-slate-700">Enable wallpaper</span>
            </label>

            <button
              onClick={() => setShowRemoveDialog(true)}
              disabled={cloudControlsDisabled}
              className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Remove wallpaper
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Eye className="w-4 h-4 text-slate-400" />
            <div className="flex-1">
              <label htmlFor="overlayOpacity" className="sr-only">Overlay opacity</label>
              <input
                id="overlayOpacity"
                type="range"
                min="25"
                max="70"
                step="1"
                value={localOpacity}
                onChange={handleOpacityChange}
                disabled={!wallpaper.active || cloudControlsDisabled}
                className="w-full accent-indigo-600"
              />
            </div>
            <span className="text-xs text-slate-500 w-8 text-right">{localOpacity}%</span>
          </div>
        </div>
      )}

      <div className="mt-5 pt-5 border-t border-slate-100">
        <label className="block text-sm font-medium text-slate-700 mb-2" htmlFor="wallpaperInput">
          Choose wallpaper image
        </label>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            id="wallpaperInput"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
            disabled={cloudControlsDisabled}
          />
          <button
            onClick={handleUpload}
            disabled={!selectedFile || cloudControlsDisabled}
            className="flex items-center justify-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap transition-colors w-full sm:w-auto"
          >
            {isBusy && wallpaper.busy === "upload" ? "Uploading..." : (
              <>
                <Upload className="w-4 h-4" />
                Upload & Apply
              </>
            )}
          </button>
        </div>
        {!signedIn && (
          <p className="text-xs text-amber-600 mt-2">Sign in to change cloud wallpaper.</p>
        )}
      </div>

      {showRemoveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Remove Wallpaper?</h3>
              <p className="text-slate-600 text-sm">
                This will delete the wallpaper from all devices. This action cannot be undone.
              </p>
            </div>
            <div className="bg-slate-50 p-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setShowRemoveDialog(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                disabled={isBusy}
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                disabled={cloudControlsDisabled}
              >
                {isBusy && wallpaper.busy === "remove" ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import { ProcessedWallpaper, WallpaperLocalMeta, WallpaperPreference } from "../types/wallpaper";

export interface WallpaperViewState {
  ready: boolean;
  active: boolean;
  imageUrl: string | null;
  overlayOpacity: number;
  preference: WallpaperPreference | null;
  busy: "upload" | "remove" | "preference" | null;
  notice: { type: "success" | "warning" | "error"; message: string } | null;
}

export interface UseWallpaperResult extends WallpaperViewState {
  uploadAndApply(file: File): Promise<boolean>;
  setEnabled(enabled: boolean): Promise<void>;
  setOverlayOpacity(value: number): Promise<void>;
  remove(): Promise<void>;
  clearNotice(): void;
}

export interface WallpaperHookDeps {
  loadMeta(): WallpaperLocalMeta | null;
  saveMeta(meta: WallpaperLocalMeta): void;
  loadBlob(): Promise<Blob | null>;
  saveDownloaded(blob: Blob, preference: WallpaperPreference): Promise<void>;
  clearCache(): Promise<void>;
  fetchPreference(userId: string): Promise<WallpaperPreference | null>;
  download(path: string): Promise<Blob>;
  savePreference(preference: WallpaperPreference): Promise<void>;
  processImage(file: File): Promise<ProcessedWallpaper>;
  replace(input: {
    userId: string;
    image: ProcessedWallpaper;
    previous: WallpaperPreference | null;
    overlayOpacity: number;
  }): Promise<{ preference: WallpaperPreference; cleanupWarning: string | null }>;
  remove(current: WallpaperPreference): Promise<{
    preference: WallpaperPreference;
    cleanupWarning: string | null;
  }>;
  createObjectUrl(blob: Blob): string;
  revokeObjectUrl(url: string): void;
  now(): Date;
}

export function useWallpaper({ userId, authReady, deps }: { userId: string | null; authReady: boolean; deps: WallpaperHookDeps }): UseWallpaperResult {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacityState] = useState(50);
  const [preference, setPreference] = useState<WallpaperPreference | null>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | "preference" | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "warning" | "error"; message: string } | null>(null);

  const opIdRef = useRef(0);
  const urlRef = useRef<string | null>(null);

  const clearNotice = useCallback(() => setNotice(null), []);

  const updateImageUrl = useCallback((blob: Blob | null) => {
    if (urlRef.current) {
      deps.revokeObjectUrl(urlRef.current);
      urlRef.current = null;
    }
    if (blob) {
      urlRef.current = deps.createObjectUrl(blob);
    }
    setImageUrl(urlRef.current);
  }, [deps]);

  useEffect(() => {
    return () => {
      if (urlRef.current) {
        deps.revokeObjectUrl(urlRef.current);
      }
    };
  }, [deps]);

  useEffect(() => {
    opIdRef.current++;
    setBusy(null);
  }, [userId, authReady]);

  useEffect(() => {
    if (!authReady) return;

    const opId = ++opIdRef.current;
    let isStale = () => opId !== opIdRef.current;

    const init = async () => {
      setReady(false);
      try {
      const meta = deps.loadMeta();
      const needsHide = meta && userId && meta.ownerUserId !== userId;

      if (needsHide) {
        await deps.clearCache();
      }

      let initialBlob: Blob | null = null;
      if (meta && !needsHide) {
        initialBlob = await deps.loadBlob();
      }

      if (isStale()) return;

      if (initialBlob && meta && !needsHide) {
        updateImageUrl(initialBlob);
        setActive(meta.enabled);
        setOverlayOpacityState(meta.overlayOpacity);
        setPreference({
          userId: meta.ownerUserId || userId || "local",
          wallpaperPath: meta.cloudPath,
          wallpaperEnabled: meta.enabled,
          overlayOpacity: meta.overlayOpacity,
          wallpaperUpdatedAt: meta.wallpaperUpdatedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        updateImageUrl(null);
        setActive(false);
        setPreference(null);
      }

      setReady(true);

      if (!userId) return;

      try {
        const cloudPref = await deps.fetchPreference(userId);
        if (isStale()) return;

        if (!cloudPref || !cloudPref.wallpaperPath) {
          setActive(false);
          updateImageUrl(null);
          setPreference(cloudPref || null);
          if (meta && !needsHide) {
            try {
              await deps.clearCache();
            } catch (e: any) {
              if (!isStale()) setNotice({ type: "warning", message: e.message || "Failed to clear cache." });
            }
          }
          return;
        }

        setPreference(cloudPref);
        setOverlayOpacityState(cloudPref.overlayOpacity);
        setActive(cloudPref.wallpaperEnabled);

        const isNewer = !meta || meta.cloudPath !== cloudPref.wallpaperPath;
        if (isNewer || !initialBlob) {
          const blob = await deps.download(cloudPref.wallpaperPath);
          if (isStale()) return;

          await deps.saveDownloaded(blob, cloudPref);
          if (isStale()) return;

          updateImageUrl(blob);
        }
      } catch (err: any) {
        if (!isStale()) {
          setNotice({ type: "warning", message: err.message || "Failed to sync wallpaper from cloud." });
        }
      }

      } catch (err: any) {
        if (!isStale()) {
          setActive(false);
          updateImageUrl(null);
          setPreference(null);
          setReady(true);
          setNotice({ type: "warning", message: err.message || "Failed to load local wallpaper cache." });
        }
      }
    };

    init();
  }, [userId, authReady, deps, updateImageUrl]);

  const uploadAndApply = async (file: File): Promise<boolean> => {
    if (!userId) return false;
    setBusy("upload");
    const opId = ++opIdRef.current;
    let isStale = () => opId !== opIdRef.current;
    try {
      const processed = await deps.processImage(file);
      if (isStale()) return false;
      const { preference: newPref, cleanupWarning } = await deps.replace({
        userId,
        image: processed,
        previous: preference,
        overlayOpacity,
      });
      if (isStale()) return false;

      setPreference(newPref);
      setActive(true);
      updateImageUrl(processed.blob);
      if (cleanupWarning) {
        setNotice({ type: "warning", message: cleanupWarning });
      } else {
        setNotice({ type: "success", message: "Wallpaper updated successfully." });
      }
      return true;
    } catch (err: any) {
      if (!isStale()) {
        setNotice({ type: "error", message: err.message || "Failed to upload wallpaper." });
      }
      return false;
    } finally {
      if (!isStale()) setBusy(null);
    }
  };

  const setEnabled = async (enabled: boolean) => {
    setActive(enabled);
    if (!userId || !preference) return;
    setBusy("preference");
    const opId = ++opIdRef.current;
    let isStale = () => opId !== opIdRef.current;
    try {
      const newPref = { ...preference, wallpaperEnabled: enabled, updatedAt: deps.now().toISOString() };
      await deps.savePreference(newPref);
      if (isStale()) return;
      setPreference(newPref);

      const meta = deps.loadMeta();
      if (meta) {
        deps.saveMeta({ ...meta, enabled });
      }
    } catch (err: any) {
      if (!isStale()) {
        setActive(!enabled);
        setNotice({ type: "error", message: err.message || "Failed to save preference." });
      }
    } finally {
      if (!isStale()) setBusy(null);
    }
  };

  const setOverlayOpacity = async (value: number) => {
    setOverlayOpacityState(value);
    if (!userId || !preference) return;
    setBusy("preference");
    const opId = ++opIdRef.current;
    let isStale = () => opId !== opIdRef.current;
    try {
      const newPref = { ...preference, overlayOpacity: value, updatedAt: deps.now().toISOString() };
      await deps.savePreference(newPref);
      if (isStale()) return;
      setPreference(newPref);

      const meta = deps.loadMeta();
      if (meta) {
        deps.saveMeta({ ...meta, overlayOpacity: value });
      }
    } catch (err: any) {
      if (!isStale()) {
        setNotice({ type: "error", message: err.message || "Failed to save preference." });
      }
    } finally {
      if (!isStale()) setBusy(null);
    }
  };

  const remove = async () => {
    if (!userId || !preference) return;
    setBusy("remove");
    const opId = ++opIdRef.current;
    let isStale = () => opId !== opIdRef.current;
    try {
      const { preference: newPref, cleanupWarning } = await deps.remove(preference);
      if (isStale()) return;
      setPreference(newPref);
      setActive(false);
      updateImageUrl(null);
      if (cleanupWarning) {
        setNotice({ type: "warning", message: cleanupWarning });
      } else {
        setNotice({ type: "success", message: "Wallpaper removed." });
      }
    } catch (err: any) {
      if (!isStale()) {
        setNotice({ type: "error", message: err.message || "Failed to remove wallpaper." });
      }
    } finally {
      if (!isStale()) setBusy(null);
    }
  };

  return {
    ready,
    active,
    imageUrl,
    overlayOpacity,
    preference,
    busy,
    notice,
    uploadAndApply,
    setEnabled,
    setOverlayOpacity,
    remove,
    clearNotice,
  };
}

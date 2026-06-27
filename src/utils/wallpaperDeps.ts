import { WallpaperHookDeps } from "../hooks/useWallpaper";
import { supabase } from "./supabaseClient";
import { loadWallpaperMeta, saveWallpaperMeta, loadWallpaperBlob, saveWallpaperBlob, clearWallpaperCache } from "./wallpaperCache";
import { fetchWallpaperPreference, saveWallpaperPreference, downloadWallpaperBlob, buildWallpaperPath, uploadWallpaperBlob, removeWallpaperBlob } from "./wallpaperCloud";
import { processWallpaperImage } from "./wallpaperImage";
import { replaceWallpaper, removeWallpaper } from "./wallpaperService";

export const realWallpaperDeps: WallpaperHookDeps = {
  loadMeta: loadWallpaperMeta,
  saveMeta: saveWallpaperMeta,
  loadBlob: loadWallpaperBlob,
  saveDownloaded: async (blob, pref) => {
    await saveWallpaperBlob(blob);
        saveWallpaperMeta({
          schemaVersion: 1,
          ownerUserId: pref.userId,
          cloudPath: pref.wallpaperPath!,
          enabled: pref.wallpaperEnabled,
          overlayOpacity: pref.overlayOpacity,
          wallpaperUpdatedAt: pref.wallpaperUpdatedAt,
        });
  },
  clearCache: clearWallpaperCache,
  fetchPreference: (userId) => fetchWallpaperPreference(supabase, userId),
  download: (path) => downloadWallpaperBlob(supabase, path),
  savePreference: (pref) => saveWallpaperPreference(supabase, pref),
  processImage: processWallpaperImage,
  replace: (input) => replaceWallpaper({
    ...input,
    deps: {
      upload: (path, blob) => uploadWallpaperBlob(supabase, path, blob),
      savePreference: (pref) => saveWallpaperPreference(supabase, pref),
      remove: (path) => removeWallpaperBlob(supabase, path),
      saveCache: async (blob, pref) => {
        await saveWallpaperBlob(blob);
        saveWallpaperMeta({
          schemaVersion: 1,
          ownerUserId: pref.userId,
          cloudPath: pref.wallpaperPath!,
          enabled: pref.wallpaperEnabled,
          overlayOpacity: pref.overlayOpacity,
          wallpaperUpdatedAt: pref.wallpaperUpdatedAt,
        });
      },
      clearCache: clearWallpaperCache,
      now: () => new Date(),
      pathFor: buildWallpaperPath,
    }
  }),
  remove: (current) => removeWallpaper({
    current,
    deps: {
      upload: (path, blob) => uploadWallpaperBlob(supabase, path, blob),
      savePreference: (pref) => saveWallpaperPreference(supabase, pref),
      remove: (path) => removeWallpaperBlob(supabase, path),
      saveCache: async (blob, pref) => {
        await saveWallpaperBlob(blob);
        saveWallpaperMeta({
          schemaVersion: 1,
          ownerUserId: pref.userId,
          cloudPath: pref.wallpaperPath!,
          enabled: pref.wallpaperEnabled,
          overlayOpacity: pref.overlayOpacity,
          wallpaperUpdatedAt: pref.wallpaperUpdatedAt,
        });
      },
      clearCache: clearWallpaperCache,
      now: () => new Date(),
      pathFor: buildWallpaperPath,
    }
  }),
  createObjectUrl: (blob) => URL.createObjectURL(blob),
  revokeObjectUrl: (url) => URL.revokeObjectURL(url),
  now: () => new Date(),
};

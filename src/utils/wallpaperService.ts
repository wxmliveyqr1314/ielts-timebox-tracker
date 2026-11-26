import { ProcessedWallpaper, WallpaperPreference } from "../types/wallpaper";

export interface WallpaperServiceDeps {
  upload(path: string, blob: Blob): Promise<void>;
  savePreference(preference: WallpaperPreference): Promise<void>;
  remove(path: string): Promise<void>;
  saveCache(blob: Blob, preference: WallpaperPreference): Promise<void>;
  clearCache(): Promise<void>;
  now(): Date;
  pathFor(userId: string, timestamp: number): string;
}

export async function replaceWallpaper(args: {
  userId: string;
  image: ProcessedWallpaper;
  previous: WallpaperPreference | null;
  overlayOpacity: number;
  deps: WallpaperServiceDeps;
}) {
  const now = args.deps.now();
  const path = args.deps.pathFor(args.userId, now.getTime());
  await args.deps.upload(path, args.image.blob);
  const preference: WallpaperPreference = {
    userId: args.userId,
    wallpaperPath: path,
    wallpaperEnabled: true,
    overlayOpacity: args.overlayOpacity,
    wallpaperUpdatedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  try {
    await args.deps.savePreference(preference);
  } catch (error) {
    try { await args.deps.remove(path); } catch { /* ignore */ }
    throw error;
  }
  let cleanupWarning: string | null = null;
  try {
    await args.deps.saveCache(args.image.blob, preference);
  } catch {
    cleanupWarning = "壁纸已保存到云端，但本地缓存失败。";
  }
  if (args.previous?.wallpaperPath && args.previous.wallpaperPath !== path) {
    try { await args.deps.remove(args.previous.wallpaperPath); }
    catch { cleanupWarning = cleanupWarning ? `${cleanupWarning} 此前的壁纸文件也未能移除。` : "新壁纸已启用，此前的壁纸文件未能移除。"; }
  }
  return { preference, cleanupWarning };
}

export async function removeWallpaper(args: {
  current: WallpaperPreference;
  deps: WallpaperServiceDeps;
}) {
  const now = args.deps.now().toISOString();
  const cleared = { ...args.current, wallpaperPath: null, wallpaperEnabled: false, wallpaperUpdatedAt: null, updatedAt: now };
  await args.deps.savePreference(cleared);
  let cleanupWarning: string | null = null;
  try {
    await args.deps.clearCache();
  } catch {
    cleanupWarning = "壁纸设置已清除，但本地缓存未能删除。";
  }
  if (args.current.wallpaperPath) {
    try { await args.deps.remove(args.current.wallpaperPath); }
    catch { cleanupWarning = cleanupWarning ? `${cleanupWarning} 云端壁纸文件也未能移除。` : "壁纸已停用，但云端文件未能移除。"; }
  }
  return { preference: cleared, cleanupWarning };
}

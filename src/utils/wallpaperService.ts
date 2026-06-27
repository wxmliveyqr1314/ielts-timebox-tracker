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
  await args.deps.saveCache(args.image.blob, preference);
  let cleanupWarning: string | null = null;
  if (args.previous?.wallpaperPath && args.previous.wallpaperPath !== path) {
    try { await args.deps.remove(args.previous.wallpaperPath); }
    catch { cleanupWarning = "The new wallpaper is active, but the previous file could not be removed."; }
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
  await args.deps.clearCache();
  let cleanupWarning: string | null = null;
  if (args.current.wallpaperPath) {
    try { await args.deps.remove(args.current.wallpaperPath); }
    catch { cleanupWarning = "Wallpaper was disabled, but the cloud file could not be removed."; }
  }
  return { preference: cleared, cleanupWarning };
}

import { WallpaperLocalMeta } from "../types/wallpaper";

export const WALLPAPER_META_KEY = "ielts_timebox_wallpaper_meta_v1";
export const DEFAULT_OVERLAY_OPACITY = 42;

export function clampOverlayOpacity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_OVERLAY_OPACITY;
  return Math.min(70, Math.max(25, Math.round(value)));
}

export function parseWallpaperLocalMeta(value: unknown): WallpaperLocalMeta | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== 1 || typeof v.enabled !== "boolean") return null;
  if (typeof v.overlayOpacity !== "number") return null;
  if (v.ownerUserId !== null && typeof v.ownerUserId !== "string") return null;
  if (v.cloudPath !== null && typeof v.cloudPath !== "string") return null;
  if (v.wallpaperUpdatedAt !== null && typeof v.wallpaperUpdatedAt !== "string") return null;
  return {
    schemaVersion: 1,
    ownerUserId: v.ownerUserId as string | null,
    cloudPath: v.cloudPath as string | null,
    enabled: v.enabled,
    overlayOpacity: clampOverlayOpacity(v.overlayOpacity),
    wallpaperUpdatedAt: v.wallpaperUpdatedAt as string | null,
  };
}

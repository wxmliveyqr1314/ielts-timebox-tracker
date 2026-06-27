import { SupabaseClient } from "@supabase/supabase-js";
import { WallpaperPreference } from "../types/wallpaper";
import { clampOverlayOpacity } from "./wallpaperMetadata";

const BUCKET = "wallpapers";

export const buildWallpaperPath = (userId: string, timestamp = Date.now()) => `${userId}/${timestamp}.webp`;

export function mapPreferenceRow(row: Record<string, unknown>): WallpaperPreference {
  return {
    userId: String(row.user_id),
    wallpaperPath: typeof row.wallpaper_path === "string" ? row.wallpaper_path : null,
    wallpaperEnabled: row.wallpaper_enabled === true,
    overlayOpacity: clampOverlayOpacity(Number(row.overlay_opacity)),
    wallpaperUpdatedAt: typeof row.wallpaper_updated_at === "string" ? row.wallpaper_updated_at : null,
    updatedAt: String(row.updated_at),
  };
}

export async function fetchWallpaperPreference(client: SupabaseClient, userId: string) {
  const { data, error } = await client.from("user_preferences").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ? mapPreferenceRow(data) : null;
}

export async function saveWallpaperPreference(client: SupabaseClient, preference: WallpaperPreference) {
  const row = {
    user_id: preference.userId,
    wallpaper_path: preference.wallpaperPath,
    wallpaper_enabled: preference.wallpaperEnabled,
    overlay_opacity: clampOverlayOpacity(preference.overlayOpacity),
    wallpaper_updated_at: preference.wallpaperUpdatedAt,
    updated_at: preference.updatedAt,
  };
  const { error } = await client.from("user_preferences").upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}

export async function uploadWallpaperBlob(client: SupabaseClient, path: string, blob: Blob) {
  const { error } = await client.storage.from(BUCKET).upload(path, blob, { contentType: "image/webp", upsert: false });
  if (error) throw error;
}

export async function downloadWallpaperBlob(client: SupabaseClient, path: string) {
  const { data, error } = await client.storage.from(BUCKET).download(path);
  if (error) throw error;
  return data;
}

export async function removeWallpaperBlob(client: SupabaseClient, path: string) {
  const { error } = await client.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

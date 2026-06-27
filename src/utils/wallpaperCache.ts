import { WallpaperLocalMeta } from "../types/wallpaper";
import { parseWallpaperLocalMeta, WALLPAPER_META_KEY } from "./wallpaperMetadata";

const DB_NAME = "ielts_timebox_wallpaper_v1";
const STORE_NAME = "wallpaper";
const ACTIVE_KEY = "active";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open wallpaper cache."));
  });
}

async function runRequest<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Wallpaper cache request failed."));
    });
  } finally {
    db.close();
  }
}

export const saveWallpaperBlob = (blob: Blob) => runRequest("readwrite", store => store.put(blob, ACTIVE_KEY));
export async function loadWallpaperBlob(): Promise<Blob | null> {
  return (await runRequest<Blob | undefined>("readonly", store => store.get(ACTIVE_KEY))) ?? null;
}
export async function clearWallpaperCache(): Promise<void> {
  localStorage.removeItem(WALLPAPER_META_KEY);
  await runRequest("readwrite", store => store.delete(ACTIVE_KEY));
}
export function loadWallpaperMeta(): WallpaperLocalMeta | null {
  try { return parseWallpaperLocalMeta(JSON.parse(localStorage.getItem(WALLPAPER_META_KEY) ?? "null")); }
  catch { return null; }
}
export function saveWallpaperMeta(meta: WallpaperLocalMeta): void {
  localStorage.setItem(WALLPAPER_META_KEY, JSON.stringify(meta));
}

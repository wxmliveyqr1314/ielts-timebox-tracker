import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearWallpaperCache, loadWallpaperBlob, saveWallpaperBlob } from "./wallpaperCache";

describe("wallpaper cache", () => {
  const values = new Map<string, string>();
  beforeEach(async () => {
    values.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    await clearWallpaperCache();
  });

  it("stores and retrieves one wallpaper blob", async () => {
    const blob = new Blob(["image"], { type: "image/webp" });
    await saveWallpaperBlob(blob);
    expect(await loadWallpaperBlob()).toEqual(blob);
  });

  it("clears cached binary data", async () => {
    await saveWallpaperBlob(new Blob(["image"], { type: "image/webp" }));
    await clearWallpaperCache();
    expect(await loadWallpaperBlob()).toBeNull();
  });
});

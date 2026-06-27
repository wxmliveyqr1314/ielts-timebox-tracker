import { describe, expect, it, vi } from "vitest";
import { replaceWallpaper, removeWallpaper, WallpaperServiceDeps } from "./wallpaperService";

const makeDeps = (overrides: Partial<WallpaperServiceDeps> = {}): WallpaperServiceDeps => ({
  upload: vi.fn(),
  savePreference: vi.fn(),
  remove: vi.fn(),
  saveCache: vi.fn(),
  clearCache: vi.fn(),
  now: vi.fn(() => new Date("2026-06-27T08:00:00.000Z")),
  pathFor: vi.fn(() => "user-1/1782547200000.webp"),
  ...overrides,
});

describe("wallpaper service orchestration", () => {
  const image = { blob: new Blob(["new"], { type: "image/webp" }), width: 1200, height: 800 };
  const previous = {
    userId: "user-1",
    wallpaperPath: "user-1/old.webp",
    wallpaperEnabled: true,
    overlayOpacity: 42,
    wallpaperUpdatedAt: "2026-06-26T00:00:00.000Z",
    updatedAt: "2026-06-26T00:00:00.000Z",
  };

  it("uploads, saves preference, caches, then removes the old object", async () => {
    const order: string[] = [];
    const deps = makeDeps({
      upload: vi.fn(async () => { order.push("upload"); }),
      savePreference: vi.fn(async () => { order.push("preference"); }),
      saveCache: vi.fn(async () => { order.push("cache"); }),
      remove: vi.fn(async () => { order.push("remove"); }),
    });
    const result = await replaceWallpaper({ userId: "user-1", image, previous, overlayOpacity: 42, deps });
    expect(order).toEqual(["upload", "preference", "cache", "remove"]);
    expect(result.preference.wallpaperPath).toBe("user-1/1782547200000.webp");
    expect(result.cleanupWarning).toBeNull();
  });

  it("keeps the old wallpaper when upload fails", async () => {
    const deps = makeDeps({ upload: vi.fn().mockRejectedValue(new Error("offline")) });
    await expect(replaceWallpaper({ userId: "user-1", image, previous, overlayOpacity: 42, deps })).rejects.toThrow("offline");
    expect(deps.savePreference).not.toHaveBeenCalled();
    expect(deps.saveCache).not.toHaveBeenCalled();
    expect(deps.remove).not.toHaveBeenCalled();
  });

  it("removes the new object when preference save fails", async () => {
    const deps = makeDeps({ savePreference: vi.fn().mockRejectedValue(new Error("db failed")) });
    await expect(replaceWallpaper({ userId: "user-1", image, previous, overlayOpacity: 42, deps })).rejects.toThrow("db failed");
    expect(deps.remove).toHaveBeenCalledWith("user-1/1782547200000.webp");
    expect(deps.saveCache).not.toHaveBeenCalled();
  });

  it("reports but does not roll back when old-object cleanup fails", async () => {
    const deps = makeDeps({ remove: vi.fn().mockRejectedValue(new Error("cleanup failed")) });
    const result = await replaceWallpaper({ userId: "user-1", image, previous, overlayOpacity: 42, deps });
    expect(result.preference.wallpaperPath).toBe("user-1/1782547200000.webp");
    expect(result.cleanupWarning).toContain("previous file");
  });

  it("clears preference and local cache before removing the cloud object", async () => {
    const order: string[] = [];
    const deps = makeDeps({
      savePreference: vi.fn(async () => { order.push("preference"); }),
      clearCache: vi.fn(async () => { order.push("cache"); }),
      remove: vi.fn(async () => { order.push("remove"); }),
    });
    const result = await removeWallpaper({ current: previous, deps });
    expect(order).toEqual(["preference", "cache", "remove"]);
    expect(result.preference).toMatchObject({ wallpaperPath: null, wallpaperEnabled: false });
  });

  it("reports but does not roll back when cache save fails", async () => {
    const deps = makeDeps({ saveCache: vi.fn().mockRejectedValue(new Error("cache failed")) });
    const result = await replaceWallpaper({ userId: "user-1", image, previous, overlayOpacity: 42, deps });
    expect(result.preference.wallpaperPath).toBe("user-1/1782547200000.webp");
    expect(result.cleanupWarning).toContain("could not be cached locally");
    expect(deps.remove).toHaveBeenCalledWith("user-1/old.webp");
  });

  it("reports but does not roll back when cache clear fails", async () => {
    const deps = makeDeps({ clearCache: vi.fn().mockRejectedValue(new Error("cache failed")) });
    const result = await removeWallpaper({ current: previous, deps });
    expect(result.preference.wallpaperEnabled).toBe(false);
    expect(result.cleanupWarning).toContain("local cache could not be deleted");
    expect(deps.remove).toHaveBeenCalledWith("user-1/old.webp");
  });
});

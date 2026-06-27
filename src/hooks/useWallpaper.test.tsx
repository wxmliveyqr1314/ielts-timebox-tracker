// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useWallpaper } from "./useWallpaper";
import { WallpaperHookDeps } from "./useWallpaper";

const makeDeps = (overrides: any = {}): WallpaperHookDeps => ({
  loadMeta: vi.fn(() => null),
  saveMeta: vi.fn(),
  loadBlob: vi.fn(async () => overrides.cachedBlob || null),
  saveDownloaded: vi.fn(async () => {}),
  clearCache: vi.fn(async () => {}),
  fetchPreference: vi.fn(async () => overrides.cloudPreference || null),
  download: vi.fn(async () => new Blob(["downloaded"], { type: "image/webp" })),
  savePreference: vi.fn(async () => {}),
  processImage: vi.fn(async () => ({ blob: new Blob(["processed"], { type: "image/webp" }), width: 2560, height: 1280 })),
  replace: vi.fn(async () => ({ preference: { wallpaperPath: "new.webp" } as any, cleanupWarning: null })),
  remove: vi.fn(async () => ({ preference: { wallpaperEnabled: false } as any, cleanupWarning: null })),
  createObjectUrl: vi.fn(() => "blob:fake-url"),
  revokeObjectUrl: vi.fn(),
  now: vi.fn(() => new Date()),
  ...overrides,
});

describe("useWallpaper", () => {
  it("renders cached wallpaper before cloud refresh", async () => {
    const cached = new Blob(["cached"], { type: "image/webp" });
    const deps = makeDeps({
      cachedBlob: cached,
      cloudPreference: null,
      loadMeta: vi.fn(() => ({ userId: "user-1", wallpaperPath: "old.webp", overlayOpacity: 50 }))
    });
    const { result } = renderHook(() => useWallpaper({ userId: "user-1", deps }));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.active).toBe(true);
  });

  it("hides a previous account cache before loading another account", async () => {
    const deps = makeDeps({
      cachedBlob: new Blob(["a"]),
      loadMeta: vi.fn(() => ({ userId: "user-a", wallpaperPath: "old.webp", overlayOpacity: 50 }))
    });
    const { result } = renderHook(() => useWallpaper({ userId: "user-b", deps }));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.active).toBe(false);
  });

  it("cloud download rejection leaves active === true, keeps the cached Object URL, and sets a warning notice", async () => {
    const deps = makeDeps({
      cachedBlob: new Blob(["cached"]),
      loadMeta: vi.fn(() => ({ userId: "user-1", wallpaperPath: "old.webp", overlayOpacity: 50 })),
      fetchPreference: vi.fn(async () => ({ userId: "user-1", wallpaperPath: "new.webp", overlayOpacity: 50, wallpaperEnabled: true })),
      download: vi.fn().mockRejectedValue(new Error("offline"))
    });
    const { result } = renderHook(() => useWallpaper({ userId: "user-1", deps }));
    await waitFor(() => expect(result.current.ready).toBe(true));
    await waitFor(() => expect(result.current.notice?.message).toContain("offline"));
    expect(result.current.active).toBe(true);
    expect(result.current.imageUrl).toBe("blob:fake-url");
  });

  it("replacing the active Blob calls revokeObjectURL with the previous URL, and unmount revokes the final URL", async () => {
    let urlCounter = 0;
    const deps = makeDeps({
      cachedBlob: new Blob(["cached"]),
      loadMeta: vi.fn(() => ({ userId: "user-1", wallpaperPath: "old.webp", overlayOpacity: 50 })),
      createObjectUrl: vi.fn(() => `blob:fake-url-${++urlCounter}`)
    });
    const { result, unmount } = renderHook(() => useWallpaper({ userId: "user-1", deps }));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(deps.createObjectUrl).toHaveBeenCalledTimes(1);
    
    await act(async () => {
      await result.current.uploadAndApply(new File([""], "test.png", { type: "image/png" }));
    });
    
    expect(deps.createObjectUrl).toHaveBeenCalledTimes(2);
    expect(deps.revokeObjectUrl).toHaveBeenCalledWith("blob:fake-url-1");
    
    unmount();
    expect(deps.revokeObjectUrl).toHaveBeenCalledWith("blob:fake-url-2");
  });

  it("a deferred startup download resolved after uploadAndApply does not replace the uploaded wallpaper URL or preference", async () => {
    let resolveDownload: (blob: Blob) => void;
    const downloadPromise = new Promise<Blob>((resolve) => { resolveDownload = resolve; });
    const deps = makeDeps({
      cachedBlob: new Blob(["cached"]),
      loadMeta: vi.fn(() => ({ userId: "user-1", wallpaperPath: "old.webp", overlayOpacity: 50 })),
      fetchPreference: vi.fn(async () => ({ userId: "user-1", wallpaperPath: "cloud-new.webp", overlayOpacity: 50, wallpaperEnabled: true })),
      download: vi.fn(() => downloadPromise),
      createObjectUrl: vi.fn((blob: Blob) => blob.size === 6 ? "blob:uploaded" : "blob:downloaded"),
    });
    
    const { result } = renderHook(() => useWallpaper({ userId: "user-1", deps }));
    await waitFor(() => expect(result.current.ready).toBe(true));
    
    await act(async () => {
      await result.current.uploadAndApply(new File(["upload"], "test.png", { type: "image/png" }));
    });
    
    expect(result.current.imageUrl).toBe("blob:uploaded");
    
    await act(async () => {
      resolveDownload(new Blob(["download"], { type: "image/webp" }));
    });
    
    expect(result.current.imageUrl).toBe("blob:uploaded");
  });
});

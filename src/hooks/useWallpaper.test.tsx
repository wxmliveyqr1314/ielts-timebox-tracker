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
      fetchPreference: vi.fn(() => new Promise(() => {})),
      loadMeta: vi.fn(() => ({ schemaVersion: 1, enabled: true, ownerUserId: "user-1", cloudPath: "old.webp", overlayOpacity: 50 }))
    });
    const { result } = renderHook(() => useWallpaper({ userId: "user-1", authReady: true, deps }));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.active).toBe(true);
  });

  it("hides a previous account cache before loading another account", async () => {
    const deps = makeDeps({
      cachedBlob: new Blob(["a"]),
      loadMeta: vi.fn(() => ({ schemaVersion: 1, enabled: true, ownerUserId: "user-a", cloudPath: "old.webp", overlayOpacity: 50 }))
    });
    const { result } = renderHook(() => useWallpaper({ userId: "user-b", authReady: true, deps }));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.active).toBe(false);
  });

  it("cloud download rejection leaves active === true, keeps the cached Object URL, and sets a warning notice", async () => {
    const deps = makeDeps({
      cachedBlob: new Blob(["cached"]),
      loadMeta: vi.fn(() => ({ schemaVersion: 1, enabled: true, ownerUserId: "user-1", cloudPath: "old.webp", overlayOpacity: 50 })),
      fetchPreference: vi.fn(async () => ({ userId: "user-1", wallpaperPath: "new.webp", overlayOpacity: 50, wallpaperEnabled: true })),
      download: vi.fn().mockRejectedValue(new Error("offline"))
    });
    const { result } = renderHook(() => useWallpaper({ userId: "user-1", authReady: true, deps }));
    await waitFor(() => expect(result.current.ready).toBe(true));
    await waitFor(() => expect(result.current.notice?.message).toContain("offline"));
    expect(result.current.active).toBe(true);
    expect(result.current.imageUrl).toBe("blob:fake-url");
  });

  it("replacing the active Blob calls revokeObjectURL with the previous URL, and unmount revokes the final URL", async () => {
    let urlCounter = 0;
    const deps = makeDeps({
      cachedBlob: new Blob(["cached"]),
      loadMeta: vi.fn(() => ({ schemaVersion: 1, enabled: true, ownerUserId: "user-1", cloudPath: "old.webp", overlayOpacity: 50 })),
      createObjectUrl: vi.fn(() => `blob:fake-url-${++urlCounter}`)
    });
    const { result, unmount } = renderHook(() => useWallpaper({ userId: "user-1", authReady: true, deps }));
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
      loadMeta: vi.fn(() => ({ schemaVersion: 1, enabled: true, ownerUserId: "user-1", cloudPath: "old.webp", overlayOpacity: 50 })),
      fetchPreference: vi.fn(async () => ({ userId: "user-1", wallpaperPath: "cloud-new.webp", overlayOpacity: 50, wallpaperEnabled: true })),
      download: vi.fn(() => downloadPromise),
      createObjectUrl: vi.fn((blob: Blob) => blob.size === 9 ? "blob:uploaded" : "blob:downloaded"),
    });

    const { result } = renderHook(() => useWallpaper({ userId: "user-1", authReady: true, deps }));
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

  it("authReady=false does not show cache and remains unready", () => {
    const deps = makeDeps({
      cachedBlob: new Blob(["cached"]),
      loadMeta: vi.fn(() => ({ schemaVersion: 1, enabled: true, ownerUserId: "user-1", cloudPath: "old.webp", overlayOpacity: 50 }))
    });
    const { result } = renderHook(() => useWallpaper({ userId: "user-1", authReady: false, deps }));
    expect(result.current.ready).toBe(false);
    expect(deps.loadBlob).not.toHaveBeenCalled();
  });

  it("account mismatch calls clearCache and does not call loadBlob, even if clearCache throws, imageUrl=null, active=false", async () => {
    const deps = makeDeps({
      cachedBlob: new Blob(["a"]),
      loadMeta: vi.fn(() => ({ schemaVersion: 1, enabled: true, ownerUserId: "user-a", cloudPath: "old.webp", overlayOpacity: 50 })),
      clearCache: vi.fn().mockRejectedValue(new Error("Clear failed"))
    });
    const { result } = renderHook(() => useWallpaper({ userId: "user-b", authReady: true, deps }));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(deps.clearCache).toHaveBeenCalled();
    expect(deps.loadBlob).not.toHaveBeenCalled();
    expect(result.current.active).toBe(false);
    expect(result.current.imageUrl).toBeNull();
  });

  it("clearCache/loadBlob errors leave ready=true, active=false", async () => {
    const deps = makeDeps({
      loadMeta: vi.fn(() => ({ schemaVersion: 1, enabled: true, ownerUserId: "user-1", cloudPath: "old.webp", overlayOpacity: 50 })),
      loadBlob: vi.fn().mockRejectedValue(new Error("IDB Error"))
    });
    const { result } = renderHook(() => useWallpaper({ userId: "user-1", authReady: true, deps }));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.active).toBe(false);
    expect(result.current.imageUrl).toBeNull();
    expect(result.current.notice?.message).toContain("IDB Error");
  });

  it("cloud wallpaperPath empty and clearCache throws error leaves old wallpaper hidden", async () => {
    const deps = makeDeps({
      cachedBlob: new Blob(["cached"]),
      loadMeta: vi.fn(() => ({ schemaVersion: 1, enabled: true, ownerUserId: "user-1", cloudPath: "old.webp", overlayOpacity: 50 })),
      fetchPreference: vi.fn(async () => ({ userId: "user-1", wallpaperPath: "", overlayOpacity: 50, wallpaperEnabled: true })),
      clearCache: vi.fn().mockRejectedValue(new Error("Clear error"))
    });
    const { result } = renderHook(() => useWallpaper({ userId: "user-1", authReady: true, deps }));
    await waitFor(() => expect(result.current.ready).toBe(true));
    // Wait for the cloud fetch to finish and update notice
    await waitFor(() => expect(result.current.notice?.message).toContain("Clear error"));
    expect(result.current.active).toBe(false);
    expect(result.current.imageUrl).toBeNull();
  });

  it("disabled wallpaper retains Blob and can be re-enabled", async () => {
    const deps = makeDeps({
      cachedBlob: new Blob(["cached"]),
      loadMeta: vi.fn(() => ({ schemaVersion: 1, enabled: false, ownerUserId: "user-1", cloudPath: "old.webp", overlayOpacity: 50 })),
      fetchPreference: vi.fn(async () => ({ userId: "user-1", wallpaperPath: "old.webp", overlayOpacity: 50, wallpaperEnabled: false }))
    });
    const { result } = renderHook(() => useWallpaper({ userId: "user-1", authReady: true, deps }));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.active).toBe(false);

    await act(async () => {
      await result.current.setEnabled(true);
    });
    expect(result.current.active).toBe(true);
    expect(deps.clearCache).not.toHaveBeenCalled();
  });

  it("busy state is cleared when user changes during an operation", async () => {
    let resolveUpload: any;
    const deps = makeDeps({
      processImage: vi.fn(() => new Promise(r => resolveUpload = r))
    });
    const { result, rerender } = renderHook(
      ({ userId }) => useWallpaper({ userId, authReady: true, deps }),
      { initialProps: { userId: "user-1" } }
    );

    act(() => {
      result.current.uploadAndApply(new File([""], "t.png", { type: "image/png" }));
    });
    expect(result.current.busy).toBe("upload");

    rerender({ userId: "user-2" });
    expect(result.current.busy).toBe(null);

    await act(async () => {
      resolveUpload({ blob: new Blob(), width: 100, height: 100 });
    });

    expect(result.current.busy).toBe(null); // still null
  });

  it("authReady=false during upload makes it stale, does not write back state", async () => {
    let resolveUpload: any;
    const deps = makeDeps({
      processImage: vi.fn(() => new Promise(r => resolveUpload = r))
    });
    const { result, rerender } = renderHook(
      ({ authReady }) => useWallpaper({ userId: "user-1", authReady, deps }),
      { initialProps: { authReady: true } }
    );

    act(() => {
      result.current.uploadAndApply(new File([""], "t.png", { type: "image/png" }));
    });
    expect(result.current.busy).toBe("upload");

    rerender({ authReady: false });
    expect(result.current.busy).toBe(null);

    await act(async () => {
      resolveUpload({ blob: new Blob(["processed"], { type: "image/webp" }), width: 100, height: 100 });
    });

    expect(result.current.active).toBe(false); // Should not apply
    expect(deps.replace).not.toHaveBeenCalled();
  });
});

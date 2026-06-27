import { describe, expect, it, vi } from "vitest";
import { buildWallpaperPath, mapPreferenceRow } from "./wallpaperCloud";
import { fetchWallpaperPreference, saveWallpaperPreference, uploadWallpaperBlob, downloadWallpaperBlob, removeWallpaperBlob } from "./wallpaperCloud";

describe("wallpaper cloud adapter", () => {
  it("builds an owned versioned WebP path", () => {
    expect(buildWallpaperPath("user-1", 123)).toBe("user-1/123.webp");
  });

  it("maps snake-case preference rows", () => {
    expect(mapPreferenceRow({
      user_id: "user-1",
      wallpaper_path: "user-1/123.webp",
      wallpaper_enabled: true,
      overlay_opacity: 42,
      wallpaper_updated_at: "2026-06-27T08:00:00.000Z",
      updated_at: "2026-06-27T08:00:00.000Z",
    })).toMatchObject({ userId: "user-1", wallpaperPath: "user-1/123.webp", wallpaperEnabled: true });
  });

  it("fetchWallpaperPreference returns null for no row", async () => {
    const mockClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null })
          })
        })
      })
    };
    expect(await fetchWallpaperPreference(mockClient as any, "user-1")).toBeNull();
  });

  it("uploadWallpaperBlob uses bucket wallpapers, image/webp, and upsert: false", async () => {
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockClient = {
      storage: {
        from: (bucket: string) => {
          expect(bucket).toBe("wallpapers");
          return { upload: mockUpload };
        }
      }
    };
    const blob = new Blob(["image"]);
    await uploadWallpaperBlob(mockClient as any, "path", blob);
    expect(mockUpload).toHaveBeenCalledWith("path", blob, { contentType: "image/webp", upsert: false });
  });

  it("downloadWallpaperBlob returns the Blob", async () => {
    const blob = new Blob(["image"]);
    const mockClient = {
      storage: {
        from: () => ({
          download: async () => ({ data: blob, error: null })
        })
      }
    };
    expect(await downloadWallpaperBlob(mockClient as any, "path")).toBe(blob);
  });

  it("removeWallpaperBlob passes exactly one owned path", async () => {
    const mockRemove = vi.fn().mockResolvedValue({ error: null });
    const mockClient = {
      storage: {
        from: () => ({ remove: mockRemove })
      }
    };
    await removeWallpaperBlob(mockClient as any, "user-1/file.webp");
    expect(mockRemove).toHaveBeenCalledWith(["user-1/file.webp"]);
  });

  it("every Supabase error is thrown rather than swallowed", async () => {
    const err = new Error("db error");
    const mockClientFailing = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ error: err })
          })
        }),
        upsert: async () => ({ error: err })
      }),
      storage: {
        from: () => ({
          upload: async () => ({ error: err }),
          download: async () => ({ error: err }),
          remove: async () => ({ error: err })
        })
      }
    };

    await expect(fetchWallpaperPreference(mockClientFailing as any, "user")).rejects.toThrow("db error");
    await expect(saveWallpaperPreference(mockClientFailing as any, {} as any)).rejects.toThrow("db error");
    await expect(uploadWallpaperBlob(mockClientFailing as any, "path", new Blob())).rejects.toThrow("db error");
    await expect(downloadWallpaperBlob(mockClientFailing as any, "path")).rejects.toThrow("db error");
    await expect(removeWallpaperBlob(mockClientFailing as any, "path")).rejects.toThrow("db error");
  });
});

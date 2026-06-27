import { describe, expect, it, vi } from "vitest";
import { calculateWallpaperSize, validateWallpaperFile, processWallpaperImage } from "./wallpaperImage";

describe("wallpaper image rules", () => {
  it("preserves aspect ratio inside 2560 pixels", () => {
    expect(calculateWallpaperSize(4000, 2000)).toEqual({ width: 2560, height: 1280 });
    expect(calculateWallpaperSize(1200, 1800)).toEqual({ width: 1200, height: 1800 });
  });

  it("rejects unsupported and oversized source files", () => {
    expect(validateWallpaperFile({ type: "image/gif", size: 1000 })).toContain("JPEG, PNG, or WebP");
    expect(validateWallpaperFile({ type: "image/jpeg", size: 16 * 1024 * 1024 })).toContain("15 MB");
    expect(validateWallpaperFile({ type: "image/png", size: 1000 })).toBeNull();
  });
});

describe("wallpaper image processing", () => {
  it("rejects invalid file directly", async () => {
    const file = new File([""], "test.gif", { type: "image/gif" });
    await expect(processWallpaperImage(file)).rejects.toThrow("Choose a JPEG, PNG, or WebP image.");
  });

  it("processes and resizes image successfully", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({
      width: 4000,
      height: 2000,
      close: vi.fn(),
    })));

    const mockContext = { drawImage: vi.fn() };
    const mockCanvas = {
      getContext: vi.fn(() => mockContext),
      toBlob: vi.fn((cb) => cb(new Blob(["mock-webp"], { type: "image/webp" }))),
    };
    vi.stubGlobal("document", {
      createElement: vi.fn((tag) => {
        if (tag === "canvas") return mockCanvas as any;
        return {} as any;
      })
    });

    const file = new File(["fake-content"], "test.png", { type: "image/png" });
    const result = await processWallpaperImage(file);

    expect(result.width).toBe(2560);
    expect(result.height).toBe(1280);
    expect(result.blob.type).toBe("image/webp");
    expect(mockContext.drawImage).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

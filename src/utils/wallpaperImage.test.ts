import { describe, expect, it } from "vitest";
import { calculateWallpaperSize, validateWallpaperFile } from "./wallpaperImage";

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

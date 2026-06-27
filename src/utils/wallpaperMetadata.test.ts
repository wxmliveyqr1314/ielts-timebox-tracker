import { describe, expect, it } from "vitest";
import { clampOverlayOpacity, parseWallpaperLocalMeta } from "./wallpaperMetadata";

describe("wallpaper metadata", () => {
  it("clamps overlay opacity to the approved range", () => {
    expect(clampOverlayOpacity(10)).toBe(25);
    expect(clampOverlayOpacity(42)).toBe(42);
    expect(clampOverlayOpacity(90)).toBe(70);
  });

  it("accepts valid versioned local metadata", () => {
    expect(parseWallpaperLocalMeta({
      schemaVersion: 1,
      ownerUserId: "user-1",
      cloudPath: "user-1/123.webp",
      enabled: true,
      overlayOpacity: 48,
      wallpaperUpdatedAt: "2026-06-27T08:00:00.000Z",
    })).toEqual({
      schemaVersion: 1,
      ownerUserId: "user-1",
      cloudPath: "user-1/123.webp",
      enabled: true,
      overlayOpacity: 48,
      wallpaperUpdatedAt: "2026-06-27T08:00:00.000Z",
    });
  });

  it("returns null for malformed metadata", () => {
    expect(parseWallpaperLocalMeta({ schemaVersion: 1, enabled: "yes" })).toBeNull();
    expect(parseWallpaperLocalMeta(null)).toBeNull();
  });
});

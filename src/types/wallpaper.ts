export interface WallpaperPreference {
  userId: string;
  wallpaperPath: string | null;
  wallpaperEnabled: boolean;
  overlayOpacity: number;
  wallpaperUpdatedAt: string | null;
  updatedAt: string;
}

export interface WallpaperLocalMeta {
  schemaVersion: 1;
  ownerUserId: string | null;
  cloudPath: string | null;
  enabled: boolean;
  overlayOpacity: number;
  wallpaperUpdatedAt: string | null;
}

export interface ProcessedWallpaper {
  blob: Blob;
  width: number;
  height: number;
}

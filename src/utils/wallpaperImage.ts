import { ProcessedWallpaper } from "../types/wallpaper";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 3 * 1024 * 1024;
const MAX_EDGE = 2560;
const MAX_PIXELS = 40_000_000;

export function validateWallpaperFile(file: Pick<File, "type" | "size">): string | null {
  if (!ALLOWED_TYPES.has(file.type)) return "Choose a JPEG, PNG, or WebP image.";
  if (file.size > MAX_SOURCE_BYTES) return "The source image must be 15 MB or smaller.";
  return null;
}

export function calculateWallpaperSize(width: number, height: number) {
  if (width <= 0 || height <= 0 || width * height > MAX_PIXELS) {
    throw new Error("The image dimensions are not supported.");
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Could not encode the wallpaper.")),
      "image/webp",
      quality,
    );
  });
}

export async function processWallpaperImage(file: File): Promise<ProcessedWallpaper> {
  const validationError = validateWallpaperFile(file);
  if (validationError) throw new Error(validationError);
  const bitmap = await createImageBitmap(file);
  try {
    let { width, height } = calculateWallpaperSize(bitmap.width, bitmap.height);
    for (const quality of [0.82, 0.74, 0.66]) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable in this browser.");
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= MAX_OUTPUT_BYTES) return { blob, width, height };
      width = Math.max(1, Math.round(width * 0.85));
      height = Math.max(1, Math.round(height * 0.85));
    }
    throw new Error("The processed wallpaper is still larger than 3 MB.");
  } finally {
    bitmap.close();
  }
}

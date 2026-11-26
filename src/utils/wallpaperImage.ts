import { ProcessedWallpaper } from "../types/wallpaper";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 3 * 1024 * 1024;
const MAX_EDGE = 2560;
const MAX_PIXELS = 40_000_000;

export function validateWallpaperFile(file: Pick<File, "type" | "size">): string | null {
  if (!ALLOWED_TYPES.has(file.type)) return "请选择 JPEG、PNG 或 WebP 图片。";
  if (file.size > MAX_SOURCE_BYTES) return "原始图片不能超过 15 MB。";
  return null;
}

export function calculateWallpaperSize(width: number, height: number) {
  if (width <= 0 || height <= 0 || width * height > MAX_PIXELS) {
    throw new Error("暂不支持此图片尺寸。");
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("无法处理壁纸图片，请换一张重试。")),
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
      if (!context) throw new Error("当前浏览器不支持图片处理，请更换浏览器重试。");
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= MAX_OUTPUT_BYTES) return { blob, width, height };
      width = Math.max(1, Math.round(width * 0.85));
      height = Math.max(1, Math.round(height * 0.85));
    }
    throw new Error("处理后的壁纸仍超过 3 MB，请选择较小的图片。");
  } finally {
    bitmap.close();
  }
}

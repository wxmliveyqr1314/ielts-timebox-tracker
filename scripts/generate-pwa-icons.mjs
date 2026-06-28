import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const source = path.join(publicDir, "icon-source.svg");

await mkdir(publicDir, { recursive: true });
await copyFile(source, path.join(publicDir, "favicon.svg"));

async function standard(size, name) {
  await sharp(source).resize(size, size).png().toFile(path.join(publicDir, name));
}

async function filled(size, name) {
  await sharp(source)
    .resize(size, size)
    .flatten({ background: "#4F46E5" })
    .png()
    .toFile(path.join(publicDir, name));
}

await Promise.all([
  standard(16, "favicon-16x16.png"),
  standard(32, "favicon-32x32.png"),
  filled(180, "apple-touch-icon.png"),
  standard(192, "pwa-192x192.png"),
  standard(512, "pwa-512x512.png"),
  filled(512, "maskable-512x512.png"),
]);

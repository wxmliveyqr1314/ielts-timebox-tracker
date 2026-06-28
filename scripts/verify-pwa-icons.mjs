import { access, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const expected = new Map([
  ["favicon-16x16.png", 16],
  ["favicon-32x32.png", 32],
  ["apple-touch-icon.png", 180],
  ["pwa-192x192.png", 192],
  ["pwa-512x512.png", 512],
  ["maskable-512x512.png", 512],
]);

await access(path.join(publicDir, "icon-source.svg"));
await access(path.join(publicDir, "favicon.svg"));

for (const [name, size] of expected) {
  const file = path.join(publicDir, name);
  const fileStat = await stat(file);
  if (fileStat.size === 0) throw new Error(`${name} is empty`);
  const metadata = await sharp(file).metadata();
  if (metadata.width !== size || metadata.height !== size) {
    throw new Error(`${name} must be ${size}x${size}`);
  }
}

console.log(`Verified ${expected.size} PNG icons.`);

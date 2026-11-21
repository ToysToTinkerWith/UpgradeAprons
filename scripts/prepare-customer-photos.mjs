import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = process.argv[2];
if (!source) throw new Error("Usage: node scripts/prepare-customer-photos.mjs <source-photo-folder>");
const photos = process.argv.includes("--market") ? [
  ["1-Pasted-Image-1.jpg", "outdoor-market"],
] : process.argv.includes("--october") ? [
  ["1-Pasted-Image-1.jpg", "mirror-selfie"],
  ["2-Photo-2.jpg", "coffee-team"],
] : [
  ["6398.jpg", "workshop"],
  ["IMG_0093.jpg", "kitchen"],
  ["IMG_0035.jpg", "outdoors"],
  ["IMG_9831.jpg", "garden"],
];
for (const [file] of photos) await access(path.join(source, file));
const output = path.resolve("public/images/customer-photos");
await mkdir(output, { recursive: true });
for (const [file, name] of photos) {
  const result = await sharp(path.join(source, file))
    .rotate()
    .resize({ width: 1200, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(path.join(output, `${name}.webp`));
  console.log(`${name}: ${result.width}x${result.height}, ${Math.round(result.size / 1024)} KB`);
}

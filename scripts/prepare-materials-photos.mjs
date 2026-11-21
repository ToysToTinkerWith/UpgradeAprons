import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = process.argv[2];
if (!source) throw new Error("Usage: node scripts/prepare-materials-photos.mjs <folder-containing-the-five-original-JPGs>");
const photos = [
  ["IMG_0015.jpg", "burgundy-strap-fasteners"],
  ["IMG_0013.jpg", "blue-leather-tonal-stitching"],
  ["IMG_0020.jpg", "eyelet-and-woven-tie"],
  ["IMG_0023.jpg", "adjustable-buckle-reverse"],
  ["IMG_9984.jpg", "crispin-workbench"],
];
for (const [file] of photos) await access(path.join(source, file));
const output = path.resolve("public/images/materials");
await mkdir(output, { recursive: true });
for (const [file, name] of photos) {
  const result = await sharp(path.join(source, file))
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(path.join(output, `${name}.webp`));
  console.log(`${name}: ${result.width}x${result.height}, ${Math.round(result.size / 1024)} KB`);
}

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const source = process.argv[2];
if (!source) throw new Error("Pass the folder containing the three supplied photos.");
const output = "public/images/product-development";
await mkdir(output, { recursive: true });
for (const [input, name] of [["2-Photo-2.jpg", "garden-holster-layout"], ["3-Photo-3.jpg", "garden-holster-loaded"]]) {
  const info = await sharp(path.join(source, input)).rotate()
    .resize({ width: 1440, height: 1920, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88 }).toFile(`${output}/${name}.webp`);
  console.log(name, info.width, info.height, info.size);
}

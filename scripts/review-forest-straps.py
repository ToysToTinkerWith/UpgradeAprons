"""Inspect Forest Mosaic ties at original pixel resolution on a dark backdrop."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

root = Path("tmp/forest-strap-review")
root.mkdir(parents=True, exist_ok=True)
source = ImageOps.exif_transpose(Image.open("product-intake/crossback/photo-5/original.jpg")).convert("RGB")
versions = [("source", source)]
for version in (2, 3):
    path = Path(f"public/images/products/forest-mosaic-crossback-v{version}.png")
    if not path.exists():
        continue
    cutout = Image.open(path).crop((64, 64, 2944, 3904))
    matte = Image.new("RGBA", cutout.size, "#080706")
    matte.alpha_composite(cutout)
    versions.append((f"v{version}", matte.convert("RGB")))

scale = 2880 / 1368
for label, bounds in {
    "left-upper": (55, 740, 190, 970),
    "left-lower": (0, 1400, 110, 1740),
    "right-upper": (1170, 735, 1335, 1000),
    "right-lower": (1250, 1450, 1368, 1750),
}.items():
    box = tuple(round(value * scale) for value in bounds)
    crops = [image.crop(box) for _, image in versions]
    sheet = Image.new("RGB", (crops[0].width * len(crops), crops[0].height))
    for index, crop in enumerate(crops):
        sheet.paste(crop, (index * crop.width, 0))
    sheet.save(root / f"{label}.png")

old = np.asarray(Image.open("public/images/products/forest-mosaic-crossback-v2.png").crop((64,64,2944,3904)))
rgb = old[:, :, :3].astype(float)
red, green, blue = rgb.transpose(2, 0, 1)
suspect = (old[:, :, 3] > 0) & (red - blue > 5) & (green > 75)
suspect[:round(780 * scale)] = False
suspect[:, round(150 * scale):round(1240 * scale)] = False
labels, _ = ndimage.label(suspect)
sizes = np.bincount(labels.ravel())
for label, box in enumerate(ndimage.find_objects(labels), 1):
    if sizes[label] < 5:
        continue
    y, x = box
    print(sizes[label], [round(x.start / scale, 1), round(y.start / scale, 1), round(x.stop / scale, 1), round(y.stop / scale, 1)])

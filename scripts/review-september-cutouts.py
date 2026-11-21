"""Compare original photo regions with the reviewed transparent cutouts."""
import sys
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

slug, source = sys.argv[1:3]
photo = ImageOps.exif_transpose(Image.open(source)).convert("RGBA")
if slug == "indigo-ivory-standard":
    photo = photo.transpose(Image.Transpose.ROTATE_90)
cutout = Image.open(f"public/images/products/{slug}-v1.png")
cutout = cutout.crop((64, 64, cutout.width - 64, cutout.height - 64))
regions = {"neck": (390, 0, 920, 560), "left-tie": (0, 430, 275, 1720), "right-tie": (1110, 430, 1368, 1740)}
out = Path(f"product-intake/standard-september/{slug}-details")
out.mkdir(exist_ok=True)
for name, bounds in regions.items():
    box = tuple(round(v * photo.width / 1368) for v in bounds)
    original = photo.crop(box)
    masked = cutout.crop(box)
    dark = Image.new("RGBA", masked.size, "#090909")
    dark.alpha_composite(masked)
    panel = Image.new("RGB", (original.width * 2, original.height))
    panel.paste(original, (0, 0))
    panel.paste(dark, (original.width, 0))
    panel.thumbnail((1400, 1600))
    panel.save(out / f"{name}.jpg", quality=96)
print(out)

"""Generate source/cutout edge comparisons at the profile's coordinate scale."""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

products = [item for item in json.loads(Path("src/data/product-catalog.json").read_text()) if item["categorySlug"] == "crossback"]
root = Path("tmp/crossback-edge-review")
root.mkdir(parents=True, exist_ok=True)
for index, product in enumerate(products, 1):
    source = ImageOps.exif_transpose(Image.open(f"product-intake/crossback/photo-{index}/original.jpg")).convert("RGB").resize((1368, 1824))
    path = Path("public" + product["image"]).with_suffix(".png")
    if "--v2" in sys.argv and not path.stem.endswith("-v2"):
        path = path.with_stem(path.stem + "-v2")
    cutout = Image.open(path).crop((64, 64, 2944, 3904)).resize((1368, 1824))
    matte = Image.new("RGBA", cutout.size, "#18614b")
    matte.alpha_composite(cutout)
    sheet = Image.new("RGB", (1000, 960))
    for row, image in enumerate([source, matte]):
        crop = image.crop((400, 0, 1000, 280)).resize((1000, 467))
        sheet.paste(crop, (0, row * 480))
    sheet.save(root / f"top-{index}.jpg", quality=97)
    grid = source.crop((400, 0, 1000, 280)).resize((1200, 560))
    draw = ImageDraw.Draw(grid)
    for x in range(0, 1200, 100):
        draw.line((x, 0, x, 560), fill="#f18383", width=1)
        draw.text((x + 3, 3), str(400 + x // 2), fill="white")
    for y in range(0, 560, 50):
        draw.line((0, y, 1200, y), fill="#f18383", width=1)
        draw.text((3, y + 3), str(y // 2), fill="white")
    grid.save(root / f"grid-{index}.jpg", quality=97)
    if index == 1:
        detail = source.crop((740, 20, 870, 130)).resize((1040, 880))
        draw = ImageDraw.Draw(detail)
        for x in range(0, 1040, 80):
            draw.line((x, 0, x, 880), fill="#f18383")
            draw.text((x + 2, 2), str(740 + x // 8), fill="white")
        for y in range(0, 880, 80):
            draw.line((0, y, 1040, y), fill="#f18383")
            draw.text((2, y + 2), str(20 + y // 8), fill="white")
        detail.save(root / "blue-arch-grid.jpg", quality=97)

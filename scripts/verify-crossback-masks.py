"""Verify lossless pixels, clear backgrounds, and intact pocket panels."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy import ndimage

products = json.loads(Path("src/data/product-catalog.json").read_text())
products = [product for product in products if product["categorySlug"] == "crossback"]
clear_points = {
    1: [(680, 275), (950, 500), (300, 450), (795, 53), (817, 67)],
    2: [(680, 230), (1000, 400), (75, 600)],
    3: [(600, 85), (830, 90), (680, 300)],
    4: [(610, 150), (790, 220), (680, 340)],
    5: [(530, 90), (820, 90), (680, 280), (135, 803), (30, 1640), (24, 1670)],
}
for index, product in enumerate(products, 1):
    folder = Path(f"product-intake/crossback/photo-{index}")
    source = np.asarray(ImageOps.exif_transpose(Image.open(folder / "original.jpg")).convert("RGB"))
    path = Path("public" + product["image"])
    if "--v2" in sys.argv and not path.stem.endswith("-v2"):
        path = path.with_stem(path.stem + "-v2")
    png = np.asarray(Image.open(path.with_suffix(".png")).convert("RGBA"))
    webp = np.asarray(Image.open(path).convert("RGBA"))
    body = png[64:-64, 64:-64]
    alpha = body[:, :, 3]
    assert np.array_equal(body[:, :, :3], source), f"{index}: source pixels changed"
    assert np.array_equal(png[:, :, 3], webp[:, :, 3]), f"{index}: WebP alpha changed"
    visible = png[:, :, 3] > 0
    assert np.array_equal(png[visible], webp[visible]), f"{index}: visible WebP pixels changed"
    assert not png[:64, :, 3].any() and not png[:, :64, 3].any()
    sx, sy = source.shape[1] / 1368, source.shape[0] / 1824
    # All five bodies contain this area, including the contrasting pocket panels.
    inside = alpha[round(800 * sy):round(1400 * sy), round(400 * sx):round(1000 * sx)]
    assert np.all(inside == 255), f"{index}: pocket/body interior removed"
    for x, y in clear_points[index]:
        assert alpha[round(y * sy), round(x * sx)] == 0, f"{index}: background retained at {x},{y}"
    if index == 1:
        for x, y in [(793, 40), (809, 45), (826, 60), (573, 81), (624, 53), (707, 157)]:
            assert alpha[round(y * sy), round(x * sx)] == 255, f"Blue strap removed at {x},{y}"
    if index == 5:
        assert alpha[round(570 * sy), round(890 * sx)] == 255, "Green leather highlight removed"
        previous = np.asarray(Image.open("public/images/products/forest-mosaic-crossback-v2.png"))[64:-64, 64:-64, 3]
        assert np.all(alpha <= previous), "Side-tie cleanup introduced new visible pixels"
        profile = json.loads((folder / "mask-profile.json").read_text())
        region = next(item for item in profile["background_cleanup_regions"] if "polygon" in item)
        area = Image.new("L", (source.shape[1], source.shape[0]))
        ImageDraw.Draw(area).polygon([(x * sx, y * sy) for x, y in region["polygon"]], fill=255)
        local = ndimage.binary_dilation(np.asarray(area) > 0, iterations=10)
        assert np.array_equal(alpha[~local], previous[~local]), "Cleanup changed pixels outside the left tie"
        for x, y in [(102, 900), (70, 1100), (46, 1400), (24, 1600), (12, 1680)]:
            assert alpha[round(y * sy), round(x * sx)] == 255, f"Left tie removed at {x},{y}"
    labels, count = ndimage.label(alpha > 0)
    areas = np.bincount(labels.ravel())[1:]
    assert count == 1, f"{index}: disconnected background specks or detached hardware"
    print(f"{index}: exact RGB/lossless WebP; clear gaps; intact body and pockets; {count} components (smallest {areas.min()}).")
print("PASS: all five original-pixel cutouts.")

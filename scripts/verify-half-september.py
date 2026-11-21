"""Verify the six half-apron cutouts preserve source pixels and clear loop gaps."""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

root = Path("product-intake/half-september")
catalog = json.loads(Path("src/data/product-catalog.json").read_text())
profiles = json.loads((root / "profiles.json").read_text())
gaps = [
    [(250, 120), (1140, 135)],
    [(205, 625), (1180, 625)],
    [(700, 1190)],
    [(308, 110), (1150, 115)],
    [(230, 615), (1165, 610)],
    [(190, 1350), (108, 1500), (1210, 1300)],
]
for index, profile in enumerate(profiles):
    name = profile["name"]
    record = json.loads((root / f"{name}.json").read_text())
    original = ImageOps.exif_transpose(Image.open(root / "originals" / profile["source"])).convert("RGB")
    pixels = np.asarray(Image.open(root / "exports" / f"{name}.png").convert("RGBA"))
    webp = np.asarray(Image.open(root / "exports" / f"{name}.webp").convert("RGBA"))
    visible = pixels[:, :, 3] > 0
    assert np.array_equal(pixels[visible], webp[visible]), name
    assert np.array_equal(pixels[:, :, 3], webp[:, :, 3]), name
    pad = record["padding"]
    interior = pixels[pad:-pad, pad:-pad]
    source = np.asarray(original.crop(record["source_crop"]))
    assert np.array_equal(interior[:, :, :3], source), f"{name}: source RGB changed"
    assert not visible[:pad].any() and not visible[-pad:].any()
    assert not visible[:, :pad].any() and not visible[:, -pad:].any()

    def alpha(x, y):
        px = round(x * original.width / 1368) - record["source_crop"][0] + pad
        py = round(y * original.height / 1824) - record["source_crop"][1] + pad
        return pixels[py, px, 3] if 0 <= py < len(pixels) and 0 <= px < pixels.shape[1] else 0

    for x, y in gaps[index]:
        assert alpha(x, y) == 0, f"{name}: backdrop at {(x, y)}"
    body_y = [300, 850, 1500, 300, 850, 1500][index]
    for x in (450, 650, 900):
        assert alpha(x, body_y) == 255, f"{name}: body/pocket damaged"
    labels, count = ndimage.label(visible, structure=np.ones((3, 3)))
    sizes = np.bincount(labels.ravel())[1:]
    assert np.count_nonzero(sizes > 30) == 1, f"{name}: disconnected strap"
    product = next(product for product in catalog if product["slug"] == name)
    assert product["categorySlug"] == "half-apron" and product["basePrice"] == 125
    assert product["specs"][1]["value"] == ("3" if index == 2 else "4")
    public = Path("public") / product["image"].lstrip("/")
    if public.exists():
        assert public.read_bytes() == (root / "exports" / f"{name}.webp").read_bytes()
    print(f"PASS {name}: original pixels, lossless WebP, transparent gaps, intact body and connected straps ({count} alpha components).")
assert len(catalog) == 21 and len({product["slug"] for product in catalog}) == 21
assert sum(product["categorySlug"] == "half-apron" for product in catalog) == 11
print("PASS 21 unique products, 11 Half-Aprons, six new listings.")

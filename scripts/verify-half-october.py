"""Check the October half-apron assets against their untouched source photos."""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

root = Path("product-intake/half-october")
catalog = json.loads(Path("src/data/product-catalog.json").read_text())
profiles = json.loads((root / "profiles.json").read_text())
gaps = [[(140, 870), (1215, 920)], [(78, 815), (1280, 770)], [(90, 790), (1280, 755)]]
for index, profile in enumerate(profiles):
    name = profile["name"]
    record = json.loads((root / f"{name}.json").read_text())
    photo = profile["photo"]
    source = ImageOps.exif_transpose(Image.open(root / "originals" / f"{photo}-Photo-{photo}.jpg")).convert("RGB")
    png = np.asarray(Image.open(root / "exports" / f"{name}.png").convert("RGBA"))
    webp = np.asarray(Image.open(root / "exports" / f"{name}.webp").convert("RGBA"))
    visible = png[:, :, 3] > 0
    assert np.array_equal(png[visible], webp[visible]), name
    assert np.array_equal(png[:, :, 3], webp[:, :, 3]), name
    pad = record["padding"]
    assert np.array_equal(png[pad:-pad, pad:-pad, :3], np.asarray(source.crop(record["source_crop"]))), name
    assert not visible[:pad].any() and not visible[-pad:].any()
    assert not visible[:, :pad].any() and not visible[:, -pad:].any()

    def alpha(x, y):
        px = round(x * source.width / 1368) - record["source_crop"][0] + pad
        py = round(y * source.height / 1824) - record["source_crop"][1] + pad
        return png[py, px, 3]

    for x, y in gaps[index]:
        assert alpha(x, y) == 0, f"{name}: backdrop remains at {(x, y)}"
    for x in (300, 550, 900):
        assert alpha(x, 1100) == 255, f"{name}: body or pocket damaged"
    labels, _ = ndimage.label(visible, structure=np.ones((3, 3)))
    assert np.count_nonzero(np.bincount(labels.ravel())[1:] > 30) == 1, name
    product = next(item for item in catalog if item["slug"] == name)
    assert product["categorySlug"] == "half-apron" and product["basePrice"] == 125
    assert next(spec["value"] for spec in product["specs"] if spec["label"] == "Pockets") == str([3, 4, 4][index])
    for extension in ("png", "webp"):
        public = Path("public/images/products") / f"{name}-v1.{extension}"
        assert public.read_bytes() == (root / "exports" / f"{name}.{extension}").read_bytes()
    print(f"PASS {name}: original RGB, lossless export, transparent gaps, connected straps, catalog and public assets.")
assert len(catalog) == len({item["slug"] for item in catalog}) == 27
assert sum(item["categorySlug"] == "half-apron" for item in catalog) == 14
print("PASS: 27 unique products, 14 half aprons.")

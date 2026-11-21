"""Original-pixel and strap regression checks for September crossbacks."""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

root = Path("product-intake/crossback-september")
items = [
    ("ivory-slate-crossback", "IMG_0058.jpg", [(615,47),(863,52),(475,248),(685,207),(90,1100)], [(600,130),(845,180),(700,280),(1100,500),(109,1250)]),
    ("pearl-stone-crossback", "IMG_0061.jpg", [(606,151),(797,132),(701,230),(130,1200),(1275,1300)], [(610,210),(824,220),(700,350),(1100,550),(1245,1250)]),
    ("ivory-teal-crossback", "IMG_0057.jpg", [(610,151),(785,118),(700,191),(500,246),(73,1200)], [(610,205),(838,270),(690,320),(1100,450),(95,1200)]),
]
catalog = json.loads(Path("src/data/product-catalog.json").read_text())
for slug, filename, solid, gaps in items:
    original = np.asarray(ImageOps.exif_transpose(Image.open(root / "originals" / filename)).convert("RGB"))
    pixels = np.asarray(Image.open(root / "exports" / f"{slug}.png"))
    webp = np.asarray(Image.open(root / "exports" / f"{slug}.webp").convert("RGBA"))
    alpha = pixels[64:-64,64:-64,3]
    assert np.array_equal(pixels[64:-64,64:-64,:3], original), slug
    visible = pixels[:,:,3] > 0
    assert np.array_equal(pixels[visible], webp[visible]), slug
    assert np.array_equal(pixels[:,:,3], webp[:,:,3]), slug
    assert not visible[:64].any() and not visible[-64:].any()
    assert not visible[:,:64].any() and not visible[:,-64:].any()
    def opacity(x,y):
        return alpha[round(y*2880/1824),round(x*2160/1368)]
    for point in solid + [(700,600),(600,1100),(850,1100),(650,1400)]:
        assert opacity(*point) > 220, f"{slug}: lost foreground at {point}"
    for point in gaps:
        assert opacity(*point) == 0, f"{slug}: backdrop at {point}"
    _, count = ndimage.label(alpha > 0, structure=np.ones((3,3)))
    assert count == 1, f"{slug}: disconnected straps ({count})"
    product = next(product for product in catalog if product["slug"] == slug)
    assert product["categorySlug"] == "crossback" and product["basePrice"] == 225
    assert product["specs"][1]["value"] == "4"
    print(f"PASS {slug}: original RGB, lossless WebP, connected straps, clear gaps, four pockets.")

half = Path("product-intake/half-september")
record = json.loads((half / "ivory-trio-half-apron.json").read_text())
new = np.asarray(Image.open(half / "exports/ivory-trio-half-apron.png"))
old = np.asarray(Image.open("public/images/products/ivory-trio-half-apron-v1.png"))
assert np.array_equal(new[:,:,:3],old[:,:,:3])
change = new[:,:,3].astype(int)-old[:,:,3].astype(int)
assert (change > 0).sum() > 5000 and not (change < 0).any()
ys,xs = np.nonzero(change)
source_y = ys-64+record["source_crop"][1]
assert source_y.min() >= 1202*2880/1824 and source_y.max() <= 1224*2880/1824
assert next(p for p in catalog if p["slug"] == "ivory-trio-half-apron")["image"].endswith("-v2.webp")
assert len(catalog) == len({p["slug"] for p in catalog}) == 24
assert sum(p["categorySlug"] == "crossback" for p in catalog) == 8
print(f"PASS Ivory Trio: restored {int((change > 0).sum())} upper-edge pixels, no removed pixels, original RGB unchanged.")
print("PASS 24 products, eight Crossbacks, 11 Half-Aprons.")

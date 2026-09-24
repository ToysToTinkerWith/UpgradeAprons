"""Verify the source-preserving cutout and review its straps at full resolution."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

root = Path("product-intake/cobalt-crimson-standard")
source = ImageOps.exif_transpose(Image.open(root / "original.jpg")).convert("RGB")
png = np.asarray(Image.open("public/images/products/cobalt-crimson-standard-v1.png"))
webp = np.asarray(Image.open("public/images/products/cobalt-crimson-standard-v1.webp"))
body = png[64:-64,64:-64]
alpha = body[:,:,3]
assert np.array_equal(body[:,:,:3], np.asarray(source)), "Source RGB changed"
assert np.array_equal(png[:,:,3],webp[:,:,3]), "WebP alpha changed"
visible = png[:,:,3] > 0
assert np.array_equal(png[visible],webp[visible]), "WebP visible pixels changed"
assert not png[:64,:,3].any() and not png[-64:,:,3].any()
assert not png[:,:64,3].any() and not png[:,-64:,3].any()
sx, sy = source.width / 1368, source.height / 1824
for x,y in [(650,160),(650,350),(250,150),(1000,100),(130,1000),(1260,1350),(600,1800)]:
    assert alpha[round(y*sy),round(x*sx)] == 0, f"Background retained at {x},{y}"
for x,y in [(650,80),(540,250),(795,280),(520,396),(832,399),(115,650),(1200,650),(45,1500),(1325,1600),(700,1450),(650,1720)]:
    assert alpha[round(y*sy),round(x*sx)] == 255, f"Apron/strap removed at {x},{y}"
assert np.all(alpha[round(900*sy):round(1700*sy),round(200*sx):round(1150*sx)] == 255), "Body or pocket pixels removed"
cutout = Image.fromarray(body)
matte = Image.new("RGBA", source.size, "#151515")
matte.alpha_composite(cutout)
for name, bounds in {
    "neck": (480,30,880,515),
    "left-tie": (60,455,225,880),
    "right-tie": (1130,440,1280,900),
    "left-tip": (0,1570,115,1780),
    "right-tip": (1260,1570,1368,1750),
}.items():
    box = tuple(round(v*(sx if i%2==0 else sy)) for i,v in enumerate(bounds))
    a,b = source.crop(box),matte.crop(box)
    sheet = Image.new("RGB", (a.width*2,a.height))
    sheet.paste(a,(0,0))
    sheet.paste(b,(a.width,0))
    sheet.save(root / "review" / f"{name}.png")
assert ndimage.label(alpha>0)[1] == 1, "Detached remnants or hardware"
print("PASS: original RGB, lossless transparent WebP, complete body/pockets, intact neck and waist ties, clear backdrop, no detached pixels.")

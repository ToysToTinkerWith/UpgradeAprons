"""Verify source pixels, pocket coverage, straps and transparency for this intake."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

root = Path("product-intake/standard-september")
cases = [
    ("charcoal-sage-standard", "IMG_0004.jpg", (300,950,1100,1650),
     [(700,15),(552,350),(835,350),(180,620),(130,1500),(1250,1400),(700,800),(850,1100),(235,887)],
     [(650,90),(670,250),(180,1100),(1225,800),(195,800),(1250,1750)]),
    ("forest-sunflower-standard", "IMG_0002.jpg", (300,900,1100,1700),
     [(650,35),(500,180),(813,230),(85,680),(40,1430),(1340,1430),(650,700),(500,1150),(145,894)],
     [(550,100),(650,170),(800,300),(100,1100),(1250,770),(1100,1800)]),
    ("indigo-ivory-standard", "IMG_9996.jpg", (300,950,1130,1730),
     [(650,45),(558,300),(810,350),(98,740),(86,1500),(1320,1500),(650,800),(720,1620),(1158,944)],
     [(650,140),(650,300),(130,1100),(1230,1000),(1230,800),(1155,880),(1100,1800)]),
]
reports = []
for slug, filename, rectangle, foreground, background in cases:
    if len(sys.argv) > 1 and sys.argv[1] != slug:
        continue
    source = ImageOps.exif_transpose(Image.open(root / filename)).convert("RGB")
    if slug == "indigo-ivory-standard":
        source = source.transpose(Image.Transpose.ROTATE_90)
    png = np.asarray(Image.open(f"public/images/products/{slug}-v1.png"))
    webp = np.asarray(Image.open(f"public/images/products/{slug}-v1.webp"))
    body = png[64:-64,64:-64]
    alpha = body[:,:,3]
    assert np.array_equal(body[:,:,:3], np.asarray(source)), f"{slug}: source RGB changed"
    assert np.array_equal(png[:,:,3], webp[:,:,3]), f"{slug}: WebP alpha changed"
    visible = png[:,:,3] > 0
    assert np.array_equal(png[visible], webp[visible]), f"{slug}: visible RGB changed"
    assert not png[:64,:,3].any() and not png[-64:,:,3].any()
    assert not png[:,:64,3].any() and not png[:,-64:,3].any()
    sx, sy = source.width / 1368, source.height / 1824
    for expected, points in [(255, foreground),(0, background)]:
        for x,y in points:
            actual = alpha[round(y*sy),round(x*sx)]
            assert actual == expected, f"{slug}: {x},{y} alpha {actual}, expected {expected}"
    x0,y0,x1,y1 = rectangle
    assert np.all(alpha[round(y0*sy):round(y1*sy),round(x0*sx):round(x1*sx)] == 255), f"{slug}: incomplete body/pockets"
    labels, count = ndimage.label(alpha > 0)
    assert count == 1, f"{slug}: {count} detached components"
    reports.append({"slug":slug,"original_rgb_preserved":True,"lossless_webp":True,"intact_body_and_pockets":True,"components":count,"sampled_straps_and_backdrop":True})
    print(f"PASS: {slug}")
(root / "verification.json").write_text(json.dumps(reports, indent=2))

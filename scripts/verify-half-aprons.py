"""Check original RGB, transparent loops and source-aligned detail previews."""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

root = Path("product-intake/half-aprons")
clear = {
    "lavender-colorblock": [(270,190),(1130,175)],
    "sage-colorblock": [(200,665),(1170,650)],
    "ivory-olive": [(154,1200),(1210,1240)],
    "turquoise-silver-orange": [(290,195),(1145,160)],
    "sage-colorblock-alternate": [(250,660),(1170,600)],
    "turquoise-bronze-orange": [(160,1160),(1255,1140)],
}
for name, points in clear.items():
    record = json.loads((root / f"{name}.json").read_text())
    original = ImageOps.exif_transpose(Image.open(root / "originals" / f"{record['photo']}-Photo-{record['photo']}.jpg")).convert("RGB")
    image = Image.open(root / "exports" / f"{name}.png")
    png = np.asarray(image)
    webp = np.asarray(Image.open(root / "exports" / f"{name}.webp"))
    body = png[64:-64,64:-64]
    assert np.array_equal(body[:,:,:3], np.asarray(original.crop(record["source_crop"])))
    assert np.array_equal(png[:,:,3], webp[:,:,3])
    visible = png[:,:,3] > 0
    assert np.array_equal(png[visible], webp[visible])
    assert not png[:64,:,3].any() and not png[-64:,:,3].any()
    assert not png[:,:64,3].any() and not png[:,-64:,3].any()
    sx, sy = original.width / 1368, original.height / 1824
    alpha = Image.new("L", original.size)
    alpha.paste(Image.fromarray(body[:,:,3]), tuple(record["source_crop"][:2]))
    for x, y in points:
        assert alpha.getpixel((round(x*sx),round(y*sy))) == 0, f"{name}: loop background retained {x},{y}"
    components = ndimage.label(visible)[1]
    assert components == 1, f"{name}: detached pixels"
    if name == "ivory-olive":
        for x,y in [(87,1160),(90,1170),(94,1180),(98,1190),(103,1200)]:
            assert alpha.getpixel((round(x*sx),round(y*sy))) > 0, f"Thin strap fold removed at {x},{y}"
        canvas = original.convert("RGBA")
        canvas.putalpha(alpha)
        matte = Image.new("RGBA", original.size, "#151515")
        matte.alpha_composite(canvas)
        box = tuple(round(v*(sx if i%2==0 else sy)) for i,v in enumerate((55,1080,160,1250)))
        a, b = original.crop(box), matte.crop(box)
        sheet = Image.new("RGB", (a.width*2,a.height))
        sheet.paste(a,(0,0))
        sheet.paste(b,(a.width,0))
        sheet.save(root / "reviews" / "ivory-left-fold.png")
    print(f"PASS {name}: exact source RGB, lossless WebP, transparent loops and padding, one component.")

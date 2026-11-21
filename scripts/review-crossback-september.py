"""Compare original pixels with cutouts around each new apron edge."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

root = Path("product-intake/crossback-september")
products = [("ivory-slate-crossback", "IMG_0058.jpg"), ("pearl-stone-crossback", "IMG_0061.jpg"), ("ivory-teal-crossback", "IMG_0057.jpg")]
regions = {"shoulders": (480,20,970,370), "left-tie": (0,680,265,1660), "right-tie": (1150,680,1368,1660)}
for slug, filename in products:
    original = ImageOps.exif_transpose(Image.open(root / "originals" / filename)).convert("RGBA")
    cutout = Image.open(root / "exports" / f"{slug}.png").crop((64,64,2224,2944))
    bg = Image.new("RGBA", original.size, "#111111")
    bg.alpha_composite(cutout)
    labels, count = ndimage.label(np.asarray(cutout)[:,:,3] > 0, structure=np.ones((3,3)))
    print(slug, sorted(np.bincount(labels.ravel())[1:], reverse=True)[:10])
    for name, bounds in regions.items():
        box = tuple(round(value*2160/1368) for value in bounds)
        a,b = original.crop(box), bg.crop(box)
        sheet = Image.new("RGB", (a.width*2,a.height))
        sheet.paste(a,(0,0))
        sheet.paste(b,(a.width,0))
        sheet.thumbnail((1600,1400))
        sheet.save(root / "reviews" / slug / f"{name}.jpg",quality=95)

half = Path("product-intake/half-september")
import json
record = json.loads((half / "ivory-trio-half-apron.json").read_text())
new = Image.open(half / "exports/ivory-trio-half-apron.png")
old = Image.open("public/images/products/ivory-trio-half-apron-v1.png")
source = Image.open(half / "originals/IMG_0024.jpg").convert("RGBA")
panels = [source]
for image in (old,new):
    full = Image.new("RGBA",source.size)
    full.paste(image.crop((64,64,image.width-64,image.height-64)), tuple(record["source_crop"][:2]))
    bg = Image.new("RGBA",source.size,"#111111")
    bg.alpha_composite(full)
    panels.append(bg)
sheet = Image.new("RGB",(1620,510))
for index,panel in enumerate(panels):
    sheet.paste(panel.crop((250,1870,1870,2040)),(0,index*170))
sheet.save(root / "reviews/trio-upper-edge-before-after.jpg",quality=96)

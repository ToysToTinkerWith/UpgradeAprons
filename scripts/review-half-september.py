"""Render original-pixel comparisons for the straps in this six-product intake."""
import json
from pathlib import Path
from PIL import Image, ImageOps

root = Path("product-intake/half-september")
for profile in json.loads((root / "profiles.json").read_text()):
    name = profile["name"]
    record = json.loads((root / f"{name}.json").read_text())
    source = ImageOps.exif_transpose(Image.open(root / "originals" / profile["source"])).convert("RGBA")
    cutout = Image.open(root / "exports" / f"{name}.png")
    layer = Image.new("RGBA", source.size)
    layer.paste(cutout.crop((64,64,cutout.width-64,cutout.height-64)), tuple(record["source_crop"][:2]))
    dark = Image.new("RGBA", source.size, "#080808")
    dark.alpha_composite(layer)
    for index, bounds in enumerate(profile["strap_regions"]):
        sx,sy = source.width/1368,source.height/1824
        box = tuple(round(value*(sx if i%2==0 else sy)) for i,value in enumerate(bounds))
        a,b = source.crop(box),dark.crop(box)
        panel = Image.new("RGB",(a.width*2,a.height))
        panel.paste(a,(0,0))
        panel.paste(b,(a.width,0))
        panel.thumbnail((1400,1200))
        panel.save(root / "reviews" / f"{name}-strap-{index}.jpg",quality=96)

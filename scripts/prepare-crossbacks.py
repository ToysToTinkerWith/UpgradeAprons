"""Reproduce five reviewed, original-pixel crossback product cutouts."""
import importlib.util
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw

spec = importlib.util.spec_from_file_location("extract_apron", Path(__file__).with_name("extract-apron.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

slugs = ["saddle-sky-crossback", "sage-workshop-crossback", "burgundy-classic-crossback", "midnight-pearl-crossback", "forest-mosaic-crossback"]
sheet = Image.new("RGB", (1800, 1000), "#171311")
for index, slug in enumerate(slugs, 1):
    folder = Path(f"product-intake/crossback/photo-{index}")
    version = json.loads((folder / "mask-profile.json").read_text()).get("output_version", 2)
    output = Path(f"public/images/products/{slug}-v{version}.png")
    review = Path(f"tmp/crossback-review-v{version}/photo-{index}")
    if len(sys.argv) == 1 or str(index) in sys.argv[1:]:
        module.extract(folder / "original.jpg", folder / "mask-profile.json", output, review)
    cutout = Image.open(output)
    matte = Image.new("RGBA", cutout.size, "#343235")
    matte.alpha_composite(cutout)
    matte.thumbnail((355, 920))
    x = (index - 1) * 360
    sheet.paste(matte.convert("RGB"), (x, 45))
    ImageDraw.Draw(sheet).text((x + 12, 15), f"{index}: {slug}", fill="white")
sheet.save("tmp/crossback-review/all-products.jpg", quality=95)

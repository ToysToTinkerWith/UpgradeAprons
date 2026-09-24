"""Check that the refined sample preserves source pixels and both waist ties."""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


source = np.asarray(Image.open("product-intake/IMG_0016/original.jpg").convert("RGB"))
path = Path("public/images/products/burgundy-bloom-standard-v3.png")
png = np.asarray(Image.open(path).convert("RGBA"))
webp = np.asarray(Image.open(path.with_suffix(".webp")).convert("RGBA"))
body = png[48:-48, 48:-48]
assert np.array_equal(body[:, :, :3], source), "Source RGB changed"
assert np.array_equal(png[:, :, 3], webp[:, :, 3]), "WebP alpha changed"
visible = png[:, :, 3] > 0
assert np.array_equal(png[visible], webp[visible]), "WebP visible pixels changed"

previous = np.asarray(Image.open("public/images/products/burgundy-bloom-standard.png"))[48:-48, 48:-48, 3]
core = ndimage.binary_erosion(previous == 255, iterations=4)
# The black ties have a cool cast; exclude the burgundy body's dark edge.
ties = (np.max(source, axis=2) < 85) & (source[:, :, 2] >= source[:, :, 0]) & core
ties[:, 300:1850] = False
assert ties[:, 1850:].sum() > 10000, "Right tie test region missing"
assert np.all(body[:, :, 3][ties] == 255), "Waist tie interior removed"
interior = ndimage.binary_erosion(previous == 255, iterations=10)
assert np.all(body[:, :, 3][interior] == 255), "Apron interior changed"
assert np.all(body[:, :, 3][previous == 0] == 0), "Mask expanded into background"
assert np.count_nonzero((previous > 0) & (body[:, :, 3] == 0)) > 1000
labels, components = ndimage.label(body[:, :, 3] > 0)
assert components == 1, "Cutout contains disconnected debris or a detached tie"
v2 = np.asarray(Image.open("public/images/products/burgundy-bloom-standard-v2.png"))[48:-48, 48:-48, 3]
assert np.all(body[:, :, 3][v2 == 0] == 0), "Refinement expanded the previous mask"
assert np.count_nonzero((v2 > 0) & (body[:, :, 3] == 0)) > 1000
print("PASS: exact source RGB, lossless WebP, both tie interiors intact, no new background pixels.")

"""Verify original colors, opaque apron bodies, intact ties and clear neck loops."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

root = Path('product-intake/standard-october')
catalog = json.loads(Path('src/data/product-catalog.json').read_text())
manifest = json.loads((root / 'manifest.json').read_text())
ties = [
    [(211, 1000), (1225, 1450)], [(126, 1000), (1276, 1400)],
    [(100, 1000), (1230, 1050)], [(81, 1300), (1269, 1400)],
    [(58, 1400), (1237, 1200)], [(97, 1250), (1211, 1000)],
    [(113, 1320), (1240, 1420)], [(194, 1400), (1257, 1300)],
]
necks = [[(700,110),(585,300)],[(680,121),(561,267)],[(650,110),(524,240)],
         [(650,73),(524,209)],[(650,65),(512,204)],[(650,102),(549,248)],
         [(700,155),(589,302)],[(700,148),(626,239)]]
for i, item in enumerate(manifest):
    name, photo = item['name'], item['photo']
    if len(sys.argv) > 1 and name not in sys.argv[1:]:
        continue
    original = ImageOps.exif_transpose(Image.open(root / 'originals' / f'{photo}-Photo-{photo}.jpg')).convert('RGB')
    png = np.asarray(Image.open(root / 'exports' / f'{name}.png').convert('RGBA'))
    webp = np.asarray(Image.open(root / 'exports' / f'{name}.webp').convert('RGBA'))
    body = png[64:-64, 64:-64]
    assert np.array_equal(body[:, :, :3], np.asarray(original)), name
    visible = png[:, :, 3] > 0
    assert np.array_equal(png[visible], webp[visible]), name
    assert np.array_equal(png[:, :, 3], webp[:, :, 3]), name
    assert not visible[:64].any() and not visible[-64:].any()
    assert not visible[:, :64].any() and not visible[:, -64:].any()
    sx, sy = original.width / 1368, original.height / 1824
    for x, y in ties[i] + necks[i] + [(650, 750), (600, 1250)]:
        assert body[round(y*sy), round(x*sx), 3] == 255, f'{name}: missing foreground at {x},{y}'
    gaps = [[(240,1050),(1168,950)],[(166,1000),(1190,990)],[(140,1000),(1185,1000)],[(130,950),(1185,950)],[(120,1000),(1180,1050)],[(149,1100),(1200,1050)],[(180,1000),(1175,1000)],[(258,1120),(1185,1000)]]
    for x, y in [(680, 260), (60, 300), (1300, 300), (680, 1790)] + gaps[i]:
        assert body[round(y*sy), round(x*sx), 3] == 0, f'{name}: backdrop at {x},{y}'
    assert np.all(body[round(880*sy):round(1350*sy), round(350*sx):round(1000*sx), 3] == 255), name
    labels, _ = ndimage.label(visible, structure=np.ones((3,3)))
    sizes = np.bincount(labels.ravel())[1:]
    assert np.count_nonzero(sizes > 200) == 1, f'{name}: detached foreground'
    product = next(product for product in catalog if product['slug'] == name)
    assert product['categorySlug'] == 'standard' and product['basePrice'] == 175
    assert next(spec['value'] for spec in product['specs'] if spec['label'] == 'Pockets') == str([4,4,4,4,3,3,3,4][i])
    for extension in ('png', 'webp'):
        public = Path('public/images/products') / f'{name}-v1.{extension}'
        if public.exists():
            assert public.read_bytes() == (root / 'exports' / f'{name}.{extension}').read_bytes()
    report_path = root / 'reviews' / name / 'extraction-report.json'
    report = json.loads(report_path.read_text())
    report.update({
        'transparent_pixel_fraction': float(np.mean(body[:, :, 3] == 0)),
        'reviewed_strap_contours': True,
        'foreground_rgb_exact_match': True,
        'png_bytes': (root / 'exports' / f'{name}.png').stat().st_size,
        'webp_bytes': (root / 'exports' / f'{name}.webp').stat().st_size,
    })
    report_path.write_text(json.dumps(report, indent=2))
    Image.fromarray(body[:, :, 3]).save(root / 'reviews' / name / 'mask.png')
    print(f'PASS {name}: original RGB, lossless WebP, opaque body, neck loop, ties, price and pockets.', flush=True)
assert len(catalog) == len({item['slug'] for item in catalog}) >= 35
assert sum(item['categorySlug'] == 'standard' for item in catalog) >= 13
print('PASS: unique catalog IDs and original Standard products retained.')

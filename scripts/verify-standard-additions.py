"""Check the three additional Standard cutouts and their catalog entries."""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

root = Path('product-intake/standard-october-additions')
catalog = json.loads(Path('src/data/product-catalog.json').read_text())
manifest = json.loads((root / 'manifest.json').read_text())
foreground_samples = [
    [(700,125),(560,310),(155,1160),(1305,1400),(650,700)],
    [(700,175),(630,280),(152,1380),(1275,1480),(650,900)],
    [(700,160),(582,270),(137,1110),(1258,1470),(650,900)],
]
background_samples = [
    [(700,280),(190,1100),(1255,1300)],
    [(700,280),(225,1090),(1207,1200)],
    [(700,280),(192,1000),(1170,1000)],
]
for index, item in enumerate(manifest):
    name, photo = item['name'], item['photo']
    original = ImageOps.exif_transpose(Image.open(root/'originals'/f'{photo}-Photo-{photo}.jpg')).convert('RGB')
    png = np.asarray(Image.open(root/'exports'/f'{name}.png'))
    webp = np.asarray(Image.open(root/'exports'/f'{name}.webp').convert('RGBA'))
    body = png[64:-64,64:-64]
    assert np.array_equal(body[:,:,:3], np.asarray(original)), name
    visible = png[:,:,3] > 0
    assert np.array_equal(png[visible], webp[visible]), name
    assert np.array_equal(png[:,:,3], webp[:,:,3]), name
    assert not visible[:64].any() and not visible[-64:].any()
    assert not visible[:,:64].any() and not visible[:,-64:].any()
    sx, sy = original.width/1368, original.height/1824
    for x,y in foreground_samples[index]:
        assert body[round(y*sy),round(x*sx),3] == 255, f'{name}: foreground {x},{y}'
    for x,y in background_samples[index] + [(60,300),(1300,300),(680,1790)]:
        assert body[round(y*sy),round(x*sx),3] == 0, f'{name}: backdrop {x},{y}'
    assert np.all(body[round(850*sy):round(1350*sy),round(350*sx):round(1000*sx),3] == 255), name
    labels,_ = ndimage.label(visible,structure=np.ones((3,3)))
    sizes = np.bincount(labels.ravel())[1:]
    assert np.count_nonzero(sizes>200) == 1, f'{name}: detached foreground'
    product = next(p for p in catalog if p['slug'] == name)
    assert product['basePrice'] == 175 and product['categorySlug'] == 'standard'
    assert next(s['value'] for s in product['specs'] if s['label']=='Pockets') == str([3,3,4][index])
    for extension in ('png','webp'):
        public = Path('public/images/products') / f'{name}-v1.{extension}'
        if public.exists():
            assert public.read_bytes() == (root/'exports'/f'{name}.{extension}').read_bytes()
    report_path = root/'reviews'/name/'extraction-report.json'
    report = json.loads(report_path.read_text())
    report.update({'reviewed_strap_contours': True, 'foreground_rgb_exact_match': True,
                   'transparent_pixel_fraction': float(np.mean(body[:,:,3]==0)),
                   'png_bytes': (root/'exports'/f'{name}.png').stat().st_size,
                   'webp_bytes': (root/'exports'/f'{name}.webp').stat().st_size})
    report_path.write_text(json.dumps(report,indent=2))
    Image.fromarray(body[:,:,3]).save(root/'reviews'/name/'mask.png')
    print(f'PASS {name}: original colors, transparency, intact apron, $175 and pocket count.',flush=True)
assert len(catalog) == len({p['slug'] for p in catalog}) >= 38
assert sum(p['categorySlug']=='standard' for p in catalog) >= 16
print('PASS: all three products included without duplicate catalog IDs.')

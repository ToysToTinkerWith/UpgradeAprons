"""Run the established original-pixel extraction for the October standards."""
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy import ndimage

intake = next((arg.split('=', 1)[1] for arg in sys.argv if arg.startswith('--intake=')), 'standard-october')
root = Path('product-intake') / intake
spec = importlib.util.spec_from_file_location('extract_apron', Path(__file__).with_name('extract-apron.py'))
extractor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extractor)
manifest = json.loads((root / 'manifest.json').read_text())


def refine_straps(name, photo):
    profile = json.loads((root / f'{name}.json').read_text())
    source = ImageOps.exif_transpose(Image.open(root / 'originals' / f'{photo}-Photo-{photo}.jpg')).convert('RGB')
    sx, sy = source.width / 1368, source.height / 1824
    path = root / 'exports' / f'{name}.png'
    previous = np.asarray(Image.open(path))[64:-64,64:-64,3] > 0
    protected = Image.new('L', source.size)
    for commands in profile['protect_paths']:
        extractor.draw_profile_path(ImageDraw.Draw(protected), commands, sx, sy)
    foreground = previous & ndimage.binary_dilation(np.asarray(protected) > 0, iterations=round(2*sx))
    straps = Image.new('L', source.size)
    for commands in profile['reviewed_strap_paths']:
        extractor.draw_profile_path(ImageDraw.Draw(straps), commands, sx, sy)
    mask = np.asarray(straps) > 0
    # Adjust only a narrow band around reviewed ribbon contours to the photo.
    radius = max(1, round(profile.get('strap_refinement_radius', 3)*sx))
    core = ndimage.binary_erosion(mask, iterations=radius)
    envelope = ndimage.binary_dilation(mask, iterations=radius)
    _, fg_indices = ndimage.distance_transform_edt(~core, return_indices=True)
    _, bg_indices = ndimage.distance_transform_edt(envelope, return_indices=True)
    colors = ndimage.gaussian_filter(np.asarray(source).astype(np.float32), sigma=(1,1,0))
    fg_distance = np.sum((colors - colors[tuple(fg_indices)])**2, axis=2)
    bg_distance = np.sum((colors - colors[tuple(bg_indices)])**2, axis=2)
    strap_foreground = core | (envelope & (fg_distance < bg_distance))
    if 'strap_max_brightness' in profile:
        strap_foreground = envelope & (np.max(colors, axis=2) < profile['strap_max_brightness'])
        strap_foreground = ndimage.binary_closing(strap_foreground, iterations=3)
    foreground |= strap_foreground
    for region in profile.get('final_warm_background_cleanup', []):
        x0, y0, x1, y1 = region
        bounds = (slice(round(y0*sy), round(y1*sy)), slice(round(x0*sx), round(x1*sx)))
        pixels = colors[bounds]
        foreground[bounds] &= ~((pixels[:,:,0]-pixels[:,:,2] > 15) & (np.max(pixels, axis=2) > 125))
    foreground = ndimage.binary_opening(foreground, iterations=2)
    foreground = ndimage.gaussian_filter(foreground.astype(np.float32), profile.get('edge_smoothing_sigma', 1.2)) >= .5
    coverage = ndimage.gaussian_filter(foreground.astype(np.float32), .55)
    alpha = np.round(foreground * np.clip((coverage-.45)/.5,0,1)*255).astype(np.uint8)
    reviewed_mask = root / 'reviewed-masks' / f'{name}.png'
    if reviewed_mask.exists():
        # Preserve reviewed strap repairs on subsequent original-photo exports.
        saved_alpha = np.asarray(Image.open(reviewed_mask).convert('L'))
        if saved_alpha.shape != alpha.shape:
            raise ValueError(f'{name}: reviewed mask does not match source dimensions')
        alpha = saved_alpha
    cutout = Image.fromarray(np.dstack((np.asarray(source), alpha)))
    padded = Image.new('RGBA', (source.width+128,source.height+128))
    padded.paste(cutout,(64,64))
    padded.save(path, optimize=True)
    padded.save(path.with_suffix('.webp'), lossless=True, method=6)
    panels = []
    for color in ('#f7f7f7','#171311'):
        matte = Image.new('RGBA',padded.size,color)
        matte.alpha_composite(padded)
        matte.thumbnail((720,960))
        panels.append(matte.convert('RGB'))
    review = Image.new('RGB',(panels[0].width*2,panels[0].height))
    for i,panel in enumerate(panels):
        review.paste(panel,(i*panel.width,0))
    review.save(root/'reviews'/name/'light-dark-review.jpg',quality=95)
    print(f'Refined {name}: reviewed straps, original RGB retained.',flush=True)


for item in manifest:
    name, photo = item['name'], item['photo']
    names = [argument for argument in sys.argv[1:] if not argument.startswith('--')]
    if not names or name in names:
        if '--refine-only' not in sys.argv:
            extractor.extract(root / 'originals' / f'{photo}-Photo-{photo}.jpg', root / f'{name}.json', root / 'exports' / f'{name}.png', root / 'reviews' / name)
        refine_straps(name,photo)

sheet = Image.new('RGB', (1600, 1180), '#27292c')
for index, item in enumerate(manifest):
    cutout = Image.open(root / 'exports' / f"{item['name']}.png").convert('RGBA')
    matte = Image.new('RGBA', cutout.size, '#27292c')
    matte.alpha_composite(cutout)
    matte.thumbnail((390, 980))
    x, y = index % 4 * 400, index // 4 * 590
    sheet.paste(matte.convert('RGB'), (x, y + 50))
    ImageDraw.Draw(sheet).text((x + 10, y + 15), item['name'], fill='white')
sheet.save(root / 'review.jpg', quality=95)

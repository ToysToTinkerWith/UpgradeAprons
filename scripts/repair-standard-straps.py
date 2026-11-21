"""Repair October waist-tie alpha masks; preserve every source RGB pixel.

Outputs are staged for review in tmp/strap-repair, never installed automatically.
"""
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy import ndimage
from scipy.interpolate import PchipInterpolator

spec = importlib.util.spec_from_file_location('extractor', Path(__file__).with_name('extract-apron.py'))
extractor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extractor)
output = Path('tmp/strap-repair')
output.mkdir(parents=True, exist_ok=True)


def snap_contour_rows(rgb, prior):
    """Track continuous photo edges; never punch color-based holes in a tie."""
    gray=ndimage.gaussian_filter(rgb.astype(float).mean(axis=2),1.2)
    gradient=np.gradient(gray,axis=1)
    intervals=[]
    for row in prior:
        changes=np.diff(np.pad(row.astype(int),(1,1)))
        intervals.append(list(zip(np.where(changes==1)[0],np.where(changes==-1)[0]-1)))
    result=prior.copy()
    start=0
    while start<len(intervals):
        count=len(intervals[start]);end=start+1
        while end<len(intervals) and len(intervals[end])==count:end+=1
        if count and end-start>=8:
            fitted=[]
            for interval in range(count):
                edges=[]
                for side in (0,1):
                    expected=np.array([intervals[y][interval][side] for y in range(start,end)])
                    xmin=max(0,int(expected.min())-12);xmax=min(prior.shape[1],int(expected.max())+13)
                    xs=np.arange(xmin,xmax)
                    sign=-1 if side==0 else 1
                    cost=-sign*gradient[start:end,xmin:xmax]*2+.3*(xs[None,:]-expected[:,None])**2
                    cost[np.abs(xs[None,:]-expected[:,None])>6]=1e6
                    score=cost[0].copy();back=np.zeros(cost.shape,dtype=np.int8)
                    shifts=np.arange(-3,4)
                    for y in range(1,len(cost)):
                        candidates=[]
                        for shift in shifts:
                            c=np.roll(score,shift)+abs(shift)*8
                            if shift>0:c[:shift]=1e6
                            if shift<0:c[shift:]=1e6
                            candidates.append(c)
                        candidates=np.array(candidates)
                        choice=np.argmin(candidates,axis=0)
                        back[y]=shifts[choice]
                        score=cost[y]+np.min(candidates,axis=0)
                    x=int(np.argmin(score));line=[]
                    for y in range(len(cost)-1,-1,-1):
                        line.append(xs[x]);x-=int(back[y,x])
                    delta=np.array(line[::-1],dtype=float)-expected
                    # Broad smoothing of offsets keeps folds and texture from
                    # becoming notches cut into the physical strap outline.
                    delta=ndimage.gaussian_filter1d(delta,min(20,max(1,len(delta)/5)))
                    edges.append(expected+np.clip(delta,-5,5))
                fitted.append(edges)
            for y in range(start,end):
                result[y]=False
                for left,right in fitted:
                    a=int(round(left[y-start]));b=int(round(right[y-start]))
                    if a<=b:result[y,a:b+1]=True
        start=end
    return result


def paths_mask(paths, size, sx, sy):
    canvas = Image.new('L', size)
    for commands in paths:
        extractor.draw_profile_path(ImageDraw.Draw(canvas), commands, sx, sy)
    return np.asarray(canvas) > 0


def repair(root, item):
    name, photo = item['name'], item['photo']
    profile = json.loads((root / f'{name}.json').read_text())
    original = ImageOps.exif_transpose(Image.open(root/'originals'/f'{photo}-Photo-{photo}.jpg')).convert('RGB')
    # Fit continuous edges at the reviewed coordinate scale, then refine alpha
    # at source resolution. No resizing or color changes to the product RGB.
    source = np.asarray(original.resize((1368, 1824), Image.Resampling.LANCZOS))
    protected = paths_mask(profile['protect_paths'], (1368, 1824), 1, 1)
    preserved = ndimage.binary_dilation(protected, iterations=2)
    previous_image = Image.open(root/'exports'/f'{name}.png').convert('RGBA')
    previous = np.asarray(previous_image)[64:-64,64:-64,3]
    alpha = previous.copy()
    repair_path = root/'strap-repairs.json'
    repairs = json.loads(repair_path.read_text()) if repair_path.exists() else {}
    manual = repairs.get(name)
    for side, commands in enumerate(profile['reviewed_strap_paths']):
        prior = paths_mask([commands], (1368, 1824), 1, 1)
        envelope = ndimage.binary_dilation(prior, iterations=18)
        yy, xx = np.where(envelope)
        x0,x1,y0,y1 = xx.min()-3,xx.max()+4,yy.min()-3,yy.max()+4
        x0,y0,x1,y1 = max(0,x0),max(0,y0),min(1368,x1),min(1824,y1)
        cut = (slice(y0,y1),slice(x0,x1))
        rgb = source[cut]
        old = prior[cut]
        fitted=snap_contour_rows(rgb,old)
        if name == 'pearl-linen-standard' and side == 0:
            # This profile's inner edge drifted onto the green tabletop.
            # Follow the continuous dark-leather edge over the lower tie.
            gray = ndimage.gaussian_filter(rgb.astype(float).mean(axis=2), 1.5)
            grad = np.gradient(gray, axis=1)
            rows, edges = [], []
            for y in range(fitted.shape[0]):
                xs = np.flatnonzero(fitted[y])
                if 755 <= y + y0 <= 1570 and len(xs):
                    candidates = np.arange(max(xs[0] + 5, xs[-1] - 35), xs[-1] + 1)
                    if len(candidates):
                        costs = -grad[y, candidates] * 3 + .005 * (candidates - xs[-1]) ** 2
                        rows.append(y)
                        edges.append(candidates[np.argmin(costs)])
            for y, edge in zip(rows, ndimage.gaussian_filter1d(np.array(edges, dtype=float), 5)):
                fitted[y, int(round(edge)) + 1:] = False
        if name == 'chocolate-ivory-standard':
            # The tan tabletop is much lighter than these black ties. Trim
            # bright edge remnants without removing any interior tie pixels.
            bright = rgb.astype(float).mean(axis=2) > 90
            for y in range(fitted.shape[0]):
                changes = np.diff(np.pad(fitted[y].astype(int), (1, 1)))
                for a, b in zip(np.where(changes == 1)[0], np.where(changes == -1)[0] - 1):
                    while a < b and bright[y, a]:
                        fitted[y, a] = False
                        a += 1
                    while b > a and bright[y, b]:
                        fitted[y, b] = False
                        b -= 1
        mask_image = Image.new('L',(1368,1824))
        mask_image.paste(Image.fromarray(fitted.astype('uint8')*255),(x0,y0))
        if manual:
            contour=manual[side]
            mask_image=Image.new('L',(1368,1824))
            draw=ImageDraw.Draw(mask_image)
            extractor.draw_profile_path(draw,contour['top'],1,1)
            rows=np.array(contour['rows'])
            ys=np.arange(rows[0,0],rows[-1,0]+.5,.5)
            left=PchipInterpolator(rows[:,0],rows[:,1])(ys)
            right=PchipInterpolator(rows[:,0],rows[:,2])(ys)
            draw.polygon(list(zip(left,ys))+list(zip(right[::-1],ys[::-1])),fill=255)
            envelope |= np.asarray(mask_image)>0
            envelope = ndimage.binary_dilation(envelope,iterations=2)
        full_mask = np.asarray(mask_image.resize(original.size,Image.Resampling.LANCZOS)).copy()
        area = Image.fromarray((envelope & ~preserved).astype('uint8')*255).resize(original.size,Image.Resampling.NEAREST)
        area = np.asarray(area)>0
        alpha[area] = full_mask[area]
    # Lanczos can leave detached, almost transparent ringing outside an edge.
    labels, count = ndimage.label(alpha > 0, structure=np.ones((3, 3)))
    maxima = ndimage.maximum(alpha, labels, index=np.arange(1, count + 1))
    ghosts = np.flatnonzero(maxima < 16) + 1
    alpha[np.isin(labels, ghosts)] = 0
    rgba = np.dstack((np.asarray(original),alpha))
    padded=Image.new('RGBA',previous_image.size)
    padded.paste(Image.fromarray(rgba),(64,64))
    padded.save(output/f'{name}.png',optimize=True)
    padded.save(output/f'{name}.webp',lossless=True,method=6)
    # Source / old / repaired comparison for each side, all at reviewed scale.
    old_small=previous_image.crop((64,64,previous_image.width-64,previous_image.height-64)).resize((1368,1824))
    new_small=Image.fromarray(rgba).resize((1368,1824))
    panels=[]
    for image in (old_small,new_small):
        matte=Image.new('RGBA',image.size,'#e8e8e8');matte.alpha_composite(image);panels.append(matte)
    sheet=Image.new('RGB',(1500,1240),'white')
    ImageDraw.Draw(sheet).text((8,8),name+' - each side: original / old / repaired',fill='black')
    for n,(x0,x1) in enumerate([(15,265),(1090,1340)]):
        for j,image in enumerate([Image.fromarray(source),*panels]):
            sheet.paste(image.crop((x0,480,x1,1680)),((n*3+j)*250,35))
    sheet.save(output/f'{name}-review.jpg',quality=96)
    print(name, 'changed alpha pixels:',np.count_nonzero(alpha!=previous),flush=True)


for intake in ('standard-october','standard-october-additions'):
    root=Path('product-intake')/intake
    for item in json.loads((root/'manifest.json').read_text()):
        names=[value for value in sys.argv[1:] if not value.startswith('--')]
        if names and item['name'] not in names: continue
        repair(root,item)

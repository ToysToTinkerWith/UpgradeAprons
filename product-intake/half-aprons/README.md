# Half-apron cutouts

Six source views, apparently five unique aprons. The sage colorblock apron is
photographed in the middle of both originals; both views are exported separately.

| File stem | Original | Position |
| --- | --- | --- |
| lavender-colorblock | Photo 1 | Top |
| sage-colorblock | Photo 1 | Middle |
| ivory-olive | Photo 1 | Bottom |
| turquoise-silver-orange | Photo 2 | Top |
| sage-colorblock-alternate | Photo 2 | Middle, alternate view |
| turquoise-bronze-orange | Photo 2 | Bottom |

`exports/` contains transparent PNG masters and lossless WebP equivalents.
No white or other solid background is embedded. Review images intentionally use
solid backgrounds to make edges inspectable; they are not product assets.

Original RGB pixels are preserved exactly. No generative image edits, recoloring,
resizing, perspective changes, or invented straps are applied. Each view is
tightly cropped and padded with 64 transparent pixels. The JSON records retain
the corresponding original-pixel crop coordinates.

The process uses the same alpha-only extraction approach as the earlier apron
photos: protected leather interiors, reviewed strap shapes, local color-based
edge refinement, OpenCV GrabCut, small-component removal, and inward feathering.
The exceptionally thin ivory-apron strap fold has explicit foreground seeds.

Reproduce with Python, NumPy, Pillow, SciPy, and OpenCV 5.0.0.93:

```powershell
C:\Python312\python.exe -m pip install --target tmp/image-tools --no-deps opencv-python-headless==5.0.0.93
C:\Python312\python.exe scripts/prepare-half-aprons.py
C:\Python312\python.exe scripts/verify-half-aprons.py
```

Pass an output stem to `prepare-half-aprons.py` to reprocess only that view.
Verification checks exact source RGB, lossless WebP alpha and visible pixels,
clear loop interiors, transparent padding, connected silhouettes, and the
restored thin fold.

## Website Listings

The five unique aprons are listed under `half-apron` in the website catalog at
the existing category base price of $125. The second sage photo is an alternate
image on the same listing, not a duplicate product. Versioned WebP copies live
in `public/images/products`; PNG masters remain in this intake folder.
Publish Hosting before creating the missing Firestore product records with
`scripts/replace-product-catalog.mjs <firebase-tools-directory> --apply --add-only`.
This preserves all existing products and owner edits and saves a backup.

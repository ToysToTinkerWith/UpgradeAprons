# September Crossbacks and Ivory Trio Correction

| Original | Listing | Pockets | Base price |
| --- | --- | --- | --- |
| IMG_0058.jpg | Ivory Slate Crossback | 4 | $225 |
| IMG_0061.jpg | Pearl Stone Crossback | 4 | $225 |
| IMG_0057.jpg | Ivory Teal Crossback | 4 | $225 |

Original 2160 x 2880 RGB pixels are preserved in PNG masters and lossless WebP
exports. Background removal changes alpha only. Existing extraction tools use
photo-specific color separation, protected body masks, local GrabCut boundary
refinement, and reviewed strap-underside paths. Each image has a transparent
64-pixel border. Straps reaching the original photo edge are not extended.

Run `scripts/extract-apron.py` with the appropriate source, same-slug JSON
profile, destination under `exports/`, and same-slug `--review-dir` under
`reviews/`. Use `scripts/review-crossback-september.py` for enlarged original
versus cutout comparisons and `scripts/verify-crossback-september.py` for
source RGB, alpha, connected straps, clear gaps, pocket counts and pricing.

## Ivory Trio Half Apron

Version 2 restores the thin photographed ivory leather edge above the black
waist belt. Version 1 lost most of that bright strip during boundary cleanup.
The profile now preserves the light pixels in that narrow area after cleanup.
No body, belt or pocket pixels were removed, no colors were altered, and no
unphotographed leather was added. The review sheet shows original, v1, and v2.

The half-apron source and extraction profile remain in `../half-september/`.
Versioned v2 public assets replace the catalog image reference; v1 is retained
for comparison and regression checks. The correction restores 6,976 alpha
pixels, all confined to the photographed upper-edge band.

## Publishing

Build and deploy Hosting before catalog changes. Use `--add-only --apply`
to create the three missing crossback records. Use `--images-only --apply
--slug=ivory-trio-half-apron` for the single existing product image correction.
Each operation creates a timestamped Firestore backup and preserves other
fields and existing products.

`scripts/verify-crossback-september-site.mjs` checks the live 24-product catalog,
eight-product Crossback filter, all three new product pages, the corrected
Ivory Trio image, prices, transparency, four viewport widths, and image viewers.

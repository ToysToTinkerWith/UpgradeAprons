# September Half-Apron Intake

Six individual products extracted from the two customer-supplied photographs:

| Original | Position | Product | Pockets |
| --- | --- | --- | --- |
| IMG_0024.jpg | Top | Ivory Indigo Clay Half Apron | 4 |
| IMG_0024.jpg | Middle | Ivory Turquoise Clay Half Apron | 4 |
| IMG_0024.jpg | Bottom | Ivory Trio Half Apron | 3 |
| IMG_0032.jpg | Top | Mist Periwinkle Sunshine Half Apron | 4 |
| IMG_0032.jpg | Middle | Ivory Periwinkle Charcoal Half Apron | 4 |
| IMG_0032.jpg | Bottom | Ivory Burgundy Utility Half Apron | 4 |

## Extraction

The original, EXIF-oriented RGB pixels are preserved. Only alpha changes;
there is no generated product detail, color replacement, perspective warp,
or invented strap extension. Each export has 64 transparent pixels of padding.

Body boundaries use the existing local-color refinement and GrabCut workflow.
Reviewed ribbon and belt outlines preserve green/blue-lit webbing that automatic
segmentation confused with the tabletop. Interior loop spaces are transparent.
The Ivory Trio belt ends at the supplied photograph's left and right edges;
no unseen buckle or extra belt length has been invented.

`profiles.json` stores reference coordinates on the 1368 x 1824 preview grid.
`strap_outlines` stores paths in the corresponding original-resolution review
crop, with `scale` converting those coordinates to the reference grid. Each
per-product JSON records the exact original-image crop and output dimensions.

Reproduce and review:

```powershell
C:/Python312/python.exe scripts/prepare-half-aprons.py --intake product-intake/half-september
C:/Python312/python.exe scripts/review-half-september.py
C:/Python312/python.exe scripts/verify-half-september.py
```

The verification checks source RGB equality, lossless WebP alpha and visible
pixels, transparent padding and strap gaps, opaque body/pocket samples,
connected straps, unique catalog IDs, category, price, and pocket counts.
The original/cutout strap comparisons and dark/light previews are in `reviews/`.

## Catalog and Publishing

All six use the existing Half-Aprons category and $125 base price. Descriptions
cover photographed colors, pocket layouts, and visible attachments, without
adding unverified dimensions or hardware alloy specifications.

Publish the static pages and versioned product images before running
`scripts/replace-product-catalog.mjs` with `--add-only --apply`. That mode backs
up the current Firestore collection, creates only missing records, and leaves
existing products and owner edits untouched.

`scripts/verify-half-september-site.mjs` verifies the live collection and all
six product pages, image alpha, $125 pricing, 320/390/768/1440px widths, and
the full-screen image viewer. Browser screenshots are written under `tmp/`.

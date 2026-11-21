# October half aprons

Three customer-supplied photographs, added as separate Half-Apron products at the existing $125 category price.

| Source | Product | Pockets |
| --- | --- | --- |
| 1-Photo-1.jpg | Bronze Rose Half Apron | 3 |
| 2-Photo-2.jpg | Pearl Olive Blue Half Apron | 4 |
| 3-Photo-3.jpg | Silver Coral Half Apron | 4 |

The cutouts use the established original-pixel mask workflow in `scripts/prepare-half-aprons.py`. Only background transparency and transparent padding are added; the leather, pockets, stitching, straps and hardware retain their original RGB values. Source-edge clipping is retained rather than inventing missing buckle or strap details.

`profiles.json` records the source-coordinate masks. Individual JSON records record the crop and padding. PNG masters and lossless WebP assets are in `exports`, with light/dark inspection images in `reviews`. Public assets use the `-v1` suffix.

Regenerate with `python scripts/prepare-half-aprons.py --intake product-intake/half-october` and verify with `python scripts/verify-half-october.py`. Browser checks are in `scripts/verify-half-october-site.mjs`.

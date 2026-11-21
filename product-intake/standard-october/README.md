# October standard aprons

Eight supplied photographs, each added as a separate Standard product at the existing $175 base price, plus tax.

| Source | Product | Pockets |
| --- | --- | --- |
| Photo 1 | Sage Ivory Burgundy Standard | 4 |
| Photo 2 | Mist Ivory Standard | 4 |
| Photo 3 | Pearl Burgundy Gold Standard | 4 |
| Photo 4 | Periwinkle Bronze Standard | 4 |
| Photo 5 | Ivory Indigo Charcoal Standard | 3 |
| Photo 6 | Ivory Crimson Charcoal Standard | 3 |
| Photo 7 | Pearl Linen Standard | 3 |
| Photo 8 | Tangerine Blue Standard | 4 |

Original photographs are retained in `originals/`. The existing `extract-apron.py` original-pixel workflow removes only the tabletop using reviewed, photo-specific masks. Leather texture, wrinkles, stitching, hardware, and ties are not redrawn, recolored or warped. The pale body and neck strap are protected; dark tie regions account for the green reflected light from the tabletop. Edges are refined locally, with inward-only feathering and 64 pixels of transparent padding.

Run `python scripts/prepare-standard-october.py` to regenerate. PNG masters and lossless WebP assets are written to `exports/`; individual light/dark review sheets and extraction reports are in `reviews/`.

Run `python scripts/verify-standard-october.py` to check exact source RGB, lossless WebP, body coverage, sampled neck and waist straps, clear backdrop, unique product IDs, prices and pocket counts. Browser checks use `scripts/verify-half-october-site.mjs <playwright-module> <base-url> standard-october`.

Publish static Hosting routes/assets before adding the eight remote records. Use `replace-product-catalog.mjs --add-only --apply --slug=<slug>` to preserve existing owner edits and back up the catalog before each addition.

## Reviewed strap repairs (2026-10-12)

The original-photo masks were repaired to restore missing waist-tie material and clean jagged background edges. Full-resolution alpha masters are retained in `reviewed-masks/`; `prepare-standard-october.py` reapplies these masks on regeneration. Original RGB pixels remain unchanged. The Ivory Crimson Charcoal contours are also recorded in `strap-repairs.json`. The repair exploration script stages comparison sheets in `tmp/strap-repair`; review before installing its output.

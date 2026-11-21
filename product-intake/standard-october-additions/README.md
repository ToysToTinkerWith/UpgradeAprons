# Additional October Standard aprons

Three supplied photographs are separate Standard products at $175 plus tax:

| Photo | Product | Pockets |
| --- | --- | --- |
| 1 | Chocolate Ivory Standard | 3 |
| 2 | Seafoam Lavender Standard | 3 |
| 3 | Ivory Rust Charcoal Standard | 4 |

Original photographs are retained in `originals/`. The existing original-pixel extraction workflow uses photo-specific masks, protected leather and neck loops, and reviewed waist-tie contours. It does not recolor or redraw the products. PNG masters and lossless WebP exports retain transparent backgrounds.

Regenerate with `python scripts/prepare-standard-october.py --intake=standard-october-additions`. Review light/dark composites in `reviews/` before copying exports into `public/images/products/` with the `-v1` suffix.

Run `python scripts/verify-standard-additions.py` for asset and catalog checks. Run `node scripts/verify-half-october-site.mjs <playwright-module> <base-url> standard-october-additions` for browser checks. Publish Hosting pages before adding remote products with `replace-product-catalog.mjs --apply --add-only --slug=<slug>`. Existing catalog records must remain unchanged.

## Reviewed strap repairs (2026-10-12)

The original-photo masks were repaired to restore missing waist-tie material and clean jagged background edges. Full-resolution alpha masters are retained in `reviewed-masks/`; `prepare-standard-october.py` reapplies these masks on regeneration. Original RGB pixels remain unchanged. The Ivory Crimson Charcoal contours are also recorded in `strap-repairs.json`. The repair exploration script stages comparison sheets in `tmp/strap-repair`; review before installing its output.

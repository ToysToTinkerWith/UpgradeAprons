# September standard apron intake

The three supplied photographs are retained here with their photo-specific alpha-mask profiles and light/dark review sheets.

| Source | Product | Category | Pocket compartments |
| --- | --- | --- | --- |
| IMG_0004.jpg | Charcoal Sage Standard | Standard | 4 |
| IMG_0002.jpg | Forest Sunflower Standard | Standard | 4 |
| IMG_9996.jpg | Indigo Ivory Standard | Standard | 4 |

Extraction follows `scripts/extract-apron.py`: original RGB pixels, reviewed masks, protected pale leather and hardware, narrow edge refinement, and inward-only alpha feathering. No generative reconstruction, recoloring, or perspective warping. The indigo photo is transposed 90 degrees counterclockwise without resampling. Parts already clipped by the source framing are not reconstructed.

Transparent PNG masters and lossless WebP site assets have 64 pixels of transparent padding. Run `scripts/verify-september-cutouts.py` to check original RGB, lossless WebP transparency, opaque body/pockets, sampled straps and empty background, and connected components.

Each listing uses the existing Standard base price of $175 and existing catalog material wording. Names, color descriptions, and pocket layouts are based on the supplied photos. Dimensions and other unprovided specifications have not been invented.

Publish the static Hosting pages/assets before creating the live records. Use `scripts/replace-product-catalog.mjs` with `--add-only --apply`; this backs up existing records and only creates missing products, preserving existing products and owner edits.

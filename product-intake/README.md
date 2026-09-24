# Product photo intake

## Current sample

- Source: `IMG_0016/original.jpg` (2160 x 2880).
- Listing: Burgundy Bloom Standard; `src/data/product-catalog.json`.
- Classification: Standard, based on the visible neck loop and separate waist ties.
- Four visible pockets: lavender chest, red floral embossed lower center, two burgundy utility pockets.
- Existing category base price retained ($175); this is not a price inferred from the photo.
- Material wording follows the client's existing catalog specification, not visual verification of leather grade.
- Selected site asset: `public/images/products/burgundy-bloom-standard-v3.webp` (refined original-pixel mask).
- Original-pixel PNG master: `public/images/products/burgundy-bloom-standard-v3.png`.
- Earlier mask and AI trials remain as comparison assets, not active product images.

## Repeatable extraction

The final selection is the original-pixel mask. AI trials changed leather details and are not used in the listing. The following workflow preserves the source RGB and changes only transparency.

Dependencies: Python, Pillow, NumPy, SciPy.

```powershell
python scripts/extract-apron.py product-intake/IMG_0016/original.jpg product-intake/IMG_0016/mask-profile.json public/images/products/burgundy-bloom-standard-v3.png
```

The script separates the cool leather and dark ties from the warm fabric, retains the connected apron, fills small highlight holes, and applies a reviewed exclusion around the neck opening. A small morphological cleanup removes attached flecks. Photo-specific edge bands remove pale fabric along the neck straps and warm fringe along the lower body; a one-source-pixel trim finishes the outline. Alpha feathers inward only, never exposing new background pixels. PNG and lossless WebP retain source resolution and foreground RGB, with transparent breathing room. It does not redraw or relight the apron. The right tie is preserved where visible, but its lower portion runs beyond the source photo's right edge. The user has no uncropped photo and chose to leave that portion as photographed, without reconstruction. The transparent cutout uses the site's original dark viewer styling, without a light-gray background.

The color settings and neck-opening polygon are specific to this photograph. For each new photo, create a new profile and review thin ties, grommets, pocket corners, pale leather, and internal openings against both light and dark backgrounds. Do not blindly reuse these thresholds on white, tan, or green leather. The original photo must include all strap ends; masking cannot restore anything outside the photo.

## Classification and copy

1. Identify construction from the original photo: crossed shoulder webbing with clip attachments = Crossback; neck loop plus waist ties = Standard; waist-only body without bib = Half-Aprons. If straps are ambiguous, request another view rather than guessing.
2. Name the apron from visible body color and its distinguishing pocket or finish, followed by its category.
3. Describe visible pockets, hardware, stitching, and straps. Count actual pockets. Do not invent dimensions, tooling methods, or material grades from appearance.
4. Keep category slugs and pricing conventions from the existing catalog. Add the reviewed product to the catalog JSON and Firebase.
5. Build the static site to generate the product route, then deploy. Adding a Firebase record alone does not create a static product route.

## Catalog replacement

The old listing data has been removed from the active catalog; the Standard and Half-Aprons categories remain. Old image files are retained as source assets used elsewhere on the site, not active listings.

`node scripts/replace-product-catalog.mjs <firebase-tools-directory>` previews the current Firebase product IDs. `--apply` first writes a local timestamped backup, then atomically deletes obsolete product documents and creates missing catalog documents. It preserves an existing matching product so owner edits are not overwritten. Add `--refresh-images` to update only the image field on existing matching records. Run only for an explicitly requested full catalog replacement.

For an image correction without catalog changes, use `--apply --images-only`. This updates only existing matching products' image fields, without creating or deleting any listings.

For new products, use `--apply --add-only` to add missing records without changing existing records or deleting anything. See `crossback/README.md` for the five Crossback intake profiles and verification steps.

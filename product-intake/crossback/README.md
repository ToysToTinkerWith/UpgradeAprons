# Crossback intake

Five client-supplied photographs, preserved at 2880 x 3840 in each photo folder.
All five are classified as Crossback based on the crossed webbing and clip-on
shoulder attachments, also confirmed by the client. Existing Standard and
Half-Aprons categories and the Burgundy Bloom Standard listing are retained.

| Photo | Listing | Visible pocket layout |
| --- | --- | --- |
| 1 | Saddle Sky Crossback | Divided chest and lower pockets; two tool loops |
| 2 | Sage Workshop Crossback | Chest, divided lower, small utility pocket |
| 3 | Burgundy Classic Crossback | Divided chest and lower; small utility pocket |
| 4 | Midnight Pearl Crossback | Chest, pale embossed center, two side pockets |
| 5 | Forest Mosaic Crossback | Divided tan chest; two contrasting lower pockets |

Prices use the existing Crossback base price of $225; no limited-edition markup.
Material language follows the existing client catalog, not an image-derived
verification of grade. Dimensions and availability are not inferred from photos.

## Reproduce

Run `python scripts/prepare-crossbacks.py` for all five, or pass photo numbers to
reprocess selected profiles. Run `python scripts/verify-crossback-masks.py`.
PNG masters and lossless WebP images retain the full-resolution source RGB.
Only alpha changes. The 64-pixel transparent border is not a white matte.

The current `-v2` images refine strap arches and fabric-edge bleed. Photo 1 uses
reviewed curved mask paths to retain the pale-blue strap's underside and remove
the similarly colored backdrop. Local smoothing avoids stair-stepped edges.
The other profiles clean fabric shadows without changing the leather pixels.
Run `python scripts/review-crossback-edges.py` for enlarged source comparisons.
Regression tests check retained strap pixels, clear gaps, connected silhouettes,
and exact source RGB in both PNG and lossless WebP.

Forest Mosaic now uses `-v3`: a polygon-limited cleanup removes warm backdrop
pixels under the left attachment and along the lower side tie. The body,
stitching, upper straps, and right tie are unchanged from v2. Regression tests
check the reported fringe locations and ensure no changes outside this region.
Run `python scripts/review-forest-straps.py` for original/v2/v3 close-ups.

For image-only revisions, deploy Hosting first, then run the catalog script with
`--apply --images-only`. It skips unchanged images, preserves other fields, and
backs up Firestore before updating versioned image references.

Profiles separate the blue or light fabric backgrounds, protect light pockets
and metal hardware, and remove fabric shadows inside the strap arches. These
settings are photo-specific. Inspect originals and cutouts at full resolution
and against contrasting backgrounds before reusing a profile. Preserve only
what is photographed; some side ties meet the original image edge.

Use `scripts/replace-product-catalog.mjs <firebase-tools-directory> --apply
--add-only` to create missing records without deleting products or overwriting
owner edits. Build and deploy Hosting to create the static category/detail routes.

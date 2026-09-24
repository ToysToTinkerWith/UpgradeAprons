# Cobalt Crimson Standard

Client-supplied photo, classified as Standard by request and the riveted neck
loop. Dark brown body; blue chest pocket, two light-blue side pockets, small
blue utility pocket, and crimson center pocket. Five pockets total.

Uses the existing Standard base price of $175. Material wording follows the
existing client catalog; leather grade is not inferred from the photograph.
No dimensions or availability claims are inferred.

The PNG master and lossless WebP retain original RGB pixels at 2880 x 3840,
with 64 transparent pixels of padding. Only alpha is changed. The neck-loop
background and waist ties are checked on contrasting backgrounds. The profile
protects the crimson pocket and brown neck underside. Optional GrabCut refines
the uncertain edge band without changing photo colors or texture.

```powershell
C:\Python312\python.exe scripts/extract-apron.py product-intake/cobalt-crimson-standard/original.jpg product-intake/cobalt-crimson-standard/mask-profile.json public/images/products/cobalt-crimson-standard-v1.png --review-dir product-intake/cobalt-crimson-standard/review
C:\Python312\python.exe scripts/verify-cobalt-crimson-mask.py
```

Dependencies: Pillow, NumPy, SciPy, and OpenCV (installed in `tmp/image-tools`
during half-apron processing). Publish Hosting, then use the catalog migration's
`--apply --add-only` mode to add this product without modifying existing records.

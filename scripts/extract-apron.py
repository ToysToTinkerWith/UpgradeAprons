"""Create an original-pixel cutout from an apron photographed on neutral fabric.

The profile records photo-specific color thresholds and protected hardware areas.
It must be reviewed for each new photo, particularly pale leather and thin ties.
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy import ndimage


def draw_profile_path(draw, commands, scale_x, scale_y):
    points = []
    current = None
    for command in commands:
        if command[0] in ("M", "L"):
            current = np.array(command[1:3], dtype=float)
            points.append(tuple(current))
        elif command[0] == "C":
            start = current.copy()
            control_a = np.array(command[1:3], dtype=float)
            control_b = np.array(command[3:5], dtype=float)
            end = np.array(command[5:7], dtype=float)
            for t in np.linspace(0, 1, 80)[1:]:
                point = (1 - t) ** 3 * start + 3 * (1 - t) ** 2 * t * control_a + 3 * (1 - t) * t ** 2 * control_b + t ** 3 * end
                points.append(tuple(point))
            current = end
        else:
            raise ValueError(f"Unsupported mask path command: {command[0]}")
    draw.polygon([(x * scale_x, y * scale_y) for x, y in points], fill=255)


def extract(source, profile_path, destination, review_dir):
    profile = json.loads(Path(profile_path).read_text())
    original = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
    rgb = np.asarray(original).astype(np.float32)
    red, green, blue = rgb.transpose(2, 0, 1)
    # Each profile is reviewed against its own backdrop and leather colors.
    mode = profile.get("mode", "burgundy")
    if mode == "blue-backdrop":
        foreground = red > green * profile["red_green_ratio"]
    elif mode == "warm-backdrop":
        foreground = blue - red > profile["blue_minus_red"]
    elif mode == "light-backdrop":
        foreground = (np.max(rgb, axis=2) < profile["dark_threshold"]) | (
            (blue - green > 5) & (red - green > 8) & (np.max(rgb, axis=2) < 195)
        )
    else:
        foreground = (blue - green > profile["blue_minus_green"]) | (
            np.max(rgb, axis=2) < profile["dark_threshold"]
        ) | (
            (red - green > profile["red_minus_green"])
            & (green < profile["red_region_max_green"])
        )
    labels, count = ndimage.label(foreground)
    sizes = np.bincount(labels.ravel())
    keep = sizes >= profile["min_component_pixels"]
    keep[0] = False
    foreground = keep[labels]

    protected = Image.new("L", original.size)
    draw = ImageDraw.Draw(protected)
    scale_x = original.width / profile["reference_width"]
    scale_y = original.height / profile["reference_height"]
    for polygon in profile.get("protect_polygons", []):
        draw.polygon([(x * scale_x, y * scale_y) for x, y in polygon], fill=255)
    for path in profile.get("protect_paths", []):
        draw_profile_path(draw, path, scale_x, scale_y)
    for ellipse in profile.get("protect_ellipses", []):
        x0, y0, x1, y1 = ellipse
        draw.ellipse((x0 * scale_x, y0 * scale_y, x1 * scale_x, y1 * scale_y), fill=255)
    for stroke in profile.get("protect_strokes", []):
        points = [(x * scale_x, y * scale_y) for x, y in stroke["points"]]
        draw.line(points, fill=255, width=round(stroke["width"] * scale_x), joint="curve")
    foreground |= np.asarray(protected) > 0

    labels, _ = ndimage.label(foreground)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    foreground = labels == sizes.argmax()
    foreground |= np.asarray(protected) > 0

    # Fill small internal highlights without filling the neck loop or tie gaps.
    holes = ndimage.binary_fill_holes(foreground) & ~foreground
    hole_labels, _ = ndimage.label(holes)
    hole_sizes = np.bincount(hole_labels.ravel())
    small_holes = hole_sizes <= profile["max_highlight_hole_pixels"]
    small_holes[0] = False
    foreground |= small_holes[hole_labels]

    excluded = Image.new("L", original.size)
    draw = ImageDraw.Draw(excluded)
    for polygon in profile.get("remove_polygons", []):
        draw.polygon([(x * scale_x, y * scale_y) for x, y in polygon], fill=255)
    for path in profile.get("remove_paths", []):
        draw_profile_path(draw, path, scale_x, scale_y)
    foreground &= np.asarray(excluded) == 0

    # Optional local edge refinement: only the narrow uncertain boundary can move.
    if profile.get("grabcut_refine"):
        sys.path.insert(0, str(Path("tmp/image-tools").resolve()))
        import cv2

        core = ndimage.binary_erosion(foreground, iterations=6)
        envelope = ndimage.binary_dilation(foreground, iterations=10)
        segmentation = np.full(foreground.shape, cv2.GC_BGD, dtype=np.uint8)
        segmentation[envelope] = cv2.GC_PR_BGD
        segmentation[foreground] = cv2.GC_PR_FGD
        segmentation[core] = cv2.GC_FGD
        cv2.setRNGSeed(0)
        cv2.grabCut(np.ascontiguousarray(np.asarray(original)[:, :, ::-1]),
                    segmentation, None, np.zeros((1, 65)), np.zeros((1, 65)),
                    4, cv2.GC_INIT_WITH_MASK)
        foreground = (segmentation == cv2.GC_FGD) | (segmentation == cv2.GC_PR_FGD)

    for region in profile.get("background_cleanup_regions", []):
        x0, y0, x1, y1 = region["bounds"]
        bounds = (slice(round(y0 * scale_y), round(y1 * scale_y)),
                  slice(round(x0 * scale_x), round(x1 * scale_x)))
        background = np.ones(foreground[bounds].shape, dtype=bool)
        if "polygon" in region:
            area = Image.new("L", original.size)
            ImageDraw.Draw(area).polygon(
                [(x * scale_x, y * scale_y) for x, y in region["polygon"]], fill=255
            )
            background &= np.asarray(area)[bounds] > 0
        if "max_green" in region:
            background &= green[bounds] >= region["max_green"]
        if "max_blue_minus_green" in region:
            background &= blue[bounds] - green[bounds] <= region["max_blue_minus_green"]
        if "min_green_minus_blue" in region:
            background &= green[bounds] - blue[bounds] >= region["min_green_minus_blue"]
        if "min_red_minus_blue" in region:
            background &= red[bounds] - blue[bounds] >= region["min_red_minus_blue"]
        if "edge_band_pixels" in region:
            distance = ndimage.distance_transform_edt(foreground)
            background &= distance[bounds] <= region["edge_band_pixels"]
        foreground[bounds] &= ~background

    # Smooth only reviewed strap-edge regions, not stitching or thin hardware.
    for region in profile.get("edge_smoothing_regions", []):
        x0, y0, x1, y1 = region["bounds"]
        bounds = (slice(round(y0 * scale_y), round(y1 * scale_y)),
                  slice(round(x0 * scale_x), round(x1 * scale_x)))
        smoothed = ndimage.gaussian_filter(foreground.astype(np.float32), region["sigma"])
        foreground[bounds] = smoothed[bounds] >= 0.5

    # Remove tiny attached fabric flecks, keeping the long, connected ties.
    radius = profile.get("edge_cleanup_radius", 1)
    if radius:
        y, x = np.ogrid[-radius:radius + 1, -radius:radius + 1]
        foreground = ndimage.binary_opening(foreground, x * x + y * y <= radius * radius)

    trim = profile.get("edge_trim_pixels", 0)
    if trim:
        foreground = ndimage.binary_erosion(foreground, iterations=trim, border_value=1)

    if mode != "burgundy":
        labels, _ = ndimage.label(foreground)
        sizes = np.bincount(labels.ravel())
        keep = sizes >= profile.get("final_component_min_pixels", 40)
        keep[0] = False
        foreground = keep[labels]

    # Feather inward only: never expose background RGB outside the mask.
    coverage = ndimage.gaussian_filter(foreground.astype(np.float32), 0.55)
    alpha = foreground * np.clip((coverage - 0.45) / 0.5, 0, 1)
    alpha = np.round(alpha * 255).astype(np.uint8)
    rgba = np.dstack((np.asarray(original), alpha))
    cutout = Image.fromarray(rgba)
    pad = profile.get("padding_pixels", 48)
    padded = Image.new("RGBA", (original.width + 2 * pad, original.height + 2 * pad))
    padded.paste(cutout, (pad, pad))
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    padded.save(destination, optimize=True)
    padded.save(destination.with_suffix(".webp"), lossless=True, method=6)
    review_dir = Path(review_dir)
    review_dir.mkdir(parents=True, exist_ok=True)
    Image.fromarray(alpha).save(review_dir / "mask.png")
    panels = []
    for color in ("#f7f7f7", "#171311"):
        matte = Image.new("RGBA", padded.size, color)
        matte.alpha_composite(padded)
        matte.thumbnail((720, 960))
        panels.append(matte.convert("RGB"))
    review = Image.new("RGB", (panels[0].width * 2, panels[0].height))
    review.paste(panels[0], (0, 0))
    review.paste(panels[1], (panels[0].width, 0))
    review.save(review_dir / "light-dark-review.jpg", quality=95)
    report = {
        "source": str(source),
        "source_size": list(original.size),
        "output_size": list(padded.size),
        "foreground_components_before_cleanup": count,
        "transparent_pixel_fraction": float(np.mean(alpha == 0)),
        "foreground_rgb_exact_match": bool(np.array_equal(rgba[:, :, :3], np.asarray(original))),
        "png_bytes": destination.stat().st_size,
        "webp_bytes": destination.with_suffix(".webp").stat().st_size,
    }
    (review_dir / "extraction-report.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("profile")
    parser.add_argument("destination")
    parser.add_argument("--review-dir", default="tmp/new-catalog-review")
    args = parser.parse_args()
    extract(args.source, args.profile, args.destination, args.review_dir)

"""Extract six photographed half-apron views using source RGB and alpha masks."""
import importlib.util
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy import ndimage

sys.path.insert(0, str(Path("tmp/image-tools").resolve()))
import cv2

ROOT = Path("product-intake/half-aprons")
ATTACHMENTS = ROOT / "originals"
spec = importlib.util.spec_from_file_location("extract_apron", Path(__file__).with_name("extract-apron.py"))
extractor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extractor)

profiles = [
    {"name": "lavender-colorblock", "photo": 1, "position": "top", "roi": [150,65,1250,550],
     "body": [["M",321,193],["C",550,190,853,176,1059,167],["L",1075,495],["C",800,500,550,508,298,510],["C",308,407,308,301,321,193]]},
    {"name": "sage-colorblock", "photo": 1, "position": "middle", "roi": [90,550,1270,1070],
     "body": [["M",277,668],["C",520,667,790,665,1081,651],["L",1107,1043],["C",810,1048,519,1053,255,1048],["L",277,668]]},
    {"name": "ivory-olive", "photo": 1, "position": "bottom", "roi": [30,1065,1320,1760],
     "body": [["M",241,1227],["C",500,1223,803,1216,1126,1224],["L",1173,1714],["C",750,1714,466,1710,198,1708],["L",241,1227]]},
    {"name": "turquoise-silver-orange", "photo": 2, "position": "top", "roi": [200,65,1230,520],
     "body": [["M",345,190],["C",550,198,890,185,1080,179],["L",1105,490],["C",1040,489,952,495,850,494],["C",650,501,485,498,325,507],["L",345,190]]},
    {"name": "sage-colorblock-alternate", "photo": 2, "position": "middle", "roi": [140,505,1270,1030],
     "body": [["M",306,638],["C",567,643,851,628,1106,616],["L",1157,999],["C",866,1013,527,1008,282,1018],["L",306,638]]},
    {"name": "turquoise-bronze-orange", "photo": 2, "position": "bottom", "roi": [50,1025,1360,1720],
     "body": [["M",257,1184],["C",553,1185,882,1175,1174,1168],["L",1235,1669],["C",915,1671,539,1678,214,1683],["L",257,1184]]},
]

# Each path follows a photographed ribbon, including the space inside its loop.
strap_paths = [
    [
        [["M",334,204],["C",298,190,255,111,222,121],["C",181,132,227,210,313,293],["L",315,276],["C",251,215,213,153,211,135],["C",214,110,244,139,269,166],["C",289,188,310,202,330,214]],
        [["M",1046,178],["C",1093,155,1166,87,1199,95],["C",1241,103,1162,233,1067,288],["L",1066,272],["C",1122,236,1193,148,1206,112],["C",1208,96,1171,113,1142,133],["C",1094,167,1075,174,1053,186]],
    ],
    [
        [["M",295,678],["C",253,652,185,628,148,615],["C",106,601,144,700,273,781],["L",273,750],["C",191,703,145,652,139,633],["C",132,610,157,635,193,647],["C",233,663,272,678,293,691]],
        [["M",1061,667],["C",1107,633,1139,574,1172,572],["C",1200,569,1224,575,1227,594],["C",1233,644,1171,724,1092,784],["L",1090,764],["C",1149,714,1210,628,1212,595],["C",1213,577,1197,577,1180,582],["C",1145,600,1104,650,1073,678]],
    ],
    [
        [["M",256,1241],["C",206,1219,126,1083,86,1097],["C",43,1104,96,1264,225,1379],["L",228,1350],["C",143,1277,99,1204,79,1128],["C",75,1081,111,1120,141,1155],["C",183,1206,222,1245,252,1256]],
        [["M",1110,1239],["C",1141,1203,1159,1112,1205,1090],["C",1236,1070,1275,1071,1280,1091],["C",1293,1165,1205,1356,1173,1398],["C",1167,1404,1156,1407,1147,1406],["L",1145,1390],["C",1172,1395,1225,1268,1252,1177],["C",1265,1131,1270,1106,1270,1091],["C",1261,1078,1229,1089,1211,1099],["C",1177,1127,1143,1213,1123,1244]],
    ],
    [
        [["M",363,203],["C",316,176,270,113,251,120],["C",215,133,272,231,338,295],["L",339,277],["C",294,235,246,160,246,138],["C",247,114,270,140,296,159],["C",322,181,341,195,359,211]],
        [["M",1064,185],["C",1103,161,1128,103,1158,100],["C",1183,92,1190,106,1184,137],["C",1176,198,1135,267,1093,295],["L",1092,278],["C",1129,243,1171,165,1180,124],["C",1182,107,1164,106,1152,119],["C",1124,142,1096,180,1074,194]],
    ],
    [
        [["M",322,653],["C",283,627,224,599,211,591],["C",166,575,187,675,299,767],["L",300,736],["C",247,697,198,641,193,613],["C",189,590,210,601,236,616],["C",267,636,299,651,318,664]],
        [["M",1094,630],["C",1124,600,1187,520,1210,520],["C",1242,516,1243,550,1237,593],["C",1230,643,1181,685,1127,709],["L",1125,691],["C",1157,671,1194,646,1211,619],["C",1232,584,1230,549,1217,537],["C",1205,524,1162,578,1141,598],["C",1119,621,1110,631,1102,638]],
    ],
    [
        [["M",278,1203],["C",224,1174,160,1070,110,1071],["C",53,1059,124,1238,247,1310],["L",249,1289],["C",168,1237,105,1143,95,1094],["C",84,1055,126,1086,156,1118],["C",209,1173,236,1194,271,1216]],
        [["M",1160,1187],["C",1200,1154,1213,1050,1276,1031],["C",1325,1013,1339,1061,1327,1114],["C",1310,1182,1262,1240,1191,1274],["L",1189,1254],["C",1242,1224,1307,1148,1314,1098],["C",1321,1051,1301,1028,1276,1040],["C",1227,1067,1207,1158,1177,1192]],
    ],
]


def extract(profile):
    source_path = ATTACHMENTS / profile.get("source", f"{profile['photo']}-Photo-{profile['photo']}.jpg")
    source = ImageOps.exif_transpose(Image.open(source_path)).convert("RGB")
    sx, sy = source.width / 1368, source.height / 1824
    roi = tuple(round(value * (sx if index % 2 == 0 else sy)) for index, value in enumerate(profile["roi"]))
    original = source.crop(roi)
    rgb = np.asarray(original)
    floating = rgb.astype(np.float32)
    red, green, blue = floating.transpose(2, 0, 1)
    body_image = Image.new("L", source.size)
    extractor.draw_profile_path(ImageDraw.Draw(body_image), profile["body"], sx, sy)
    body = np.asarray(body_image.crop(roi)) > 0

    # Refine the traced body boundary against nearby real foreground/background
    # colors. The interior is protected, including teal pockets like the backdrop.
    radius = round(8 * sx)
    core = ndimage.binary_erosion(body, iterations=radius)
    envelope = ndimage.binary_dilation(body, iterations=radius)
    _, fg_indices = ndimage.distance_transform_edt(~core, return_indices=True)
    _, bg_indices = ndimage.distance_transform_edt(envelope, return_indices=True)
    local = ndimage.gaussian_filter(floating, sigma=(1.2, 1.2, 0))
    fg_colors = local[tuple(fg_indices)]
    bg_colors = local[tuple(bg_indices)]
    fg_distance = np.sum((local - fg_colors) ** 2, axis=2)
    bg_distance = np.sum((local - bg_colors) ** 2, axis=2)
    foreground = core | (envelope & (fg_distance < bg_distance))

    strap_image = Image.new("L", source.size)
    if "strap_regions" in profile:
        for rectangle in profile["strap_regions"]:
            ImageDraw.Draw(strap_image).rectangle(tuple(value * (sx if index % 2 == 0 else sy) for index, value in enumerate(rectangle)), fill=255)
        strap_envelope = np.asarray(strap_image.crop(roi)) > 0
        straps = strap_envelope & (np.max(floating, axis=2) < 110) & (green - red < 28) & (blue - red < 45)
    else:
        for path in strap_paths[profiles.index(profile)]:
            extractor.draw_profile_path(ImageDraw.Draw(strap_image), path, sx, sy)
        straps = np.asarray(strap_image.crop(roi)) > 0
        strap_envelope = ndimage.binary_dilation(straps, iterations=round(12 * sx))
    segmentation = np.full(body.shape, cv2.GC_BGD, dtype=np.uint8)
    segmentation[strap_envelope | envelope] = cv2.GC_PR_BGD
    segmentation[straps | foreground] = cv2.GC_PR_FGD
    sure_straps = strap_envelope & (np.max(floating, axis=2) < 60) & (green - red < 7)
    segmentation[core | sure_straps] = cv2.GC_FGD
    if "strap_seeds" in profile:
        seed = Image.new("L", source.size)
        for stroke in profile["strap_seeds"]:
            ImageDraw.Draw(seed).line([(x*sx,y*sy) for x,y in stroke["points"]], fill=255, width=round(stroke.get("width",3)*sx), joint="curve")
        for polygon in profile.get("hardware", []):
            ImageDraw.Draw(seed).polygon([(x*sx,y*sy) for x,y in polygon], fill=255)
        segmentation[np.asarray(seed.crop(roi)) > 0] = cv2.GC_FGD
    if profile["name"] == "ivory-olive":
        seed = Image.new("L", original.size)
        fold = [(84,1150),(87,1160),(90,1170),(94,1180),(98,1190),(103,1200),(111,1210),(117,1220),(122,1230)]
        ImageDraw.Draw(seed).line([(round(x*sx)-roi[0],round(y*sy)-roi[1]) for x,y in fold], fill=255, width=3)
        segmentation[np.asarray(seed) > 0] = cv2.GC_FGD
    cv2.setRNGSeed(0)
    cv2.grabCut(np.ascontiguousarray(rgb[:, :, ::-1]), segmentation, None,
                np.zeros((1, 65)), np.zeros((1, 65)), 5, cv2.GC_INIT_WITH_MASK)
    foreground = (segmentation == cv2.GC_FGD) | (segmentation == cv2.GC_PR_FGD)
    labels, _ = ndimage.label(foreground)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    foreground = labels == sizes.argmax()
    foreground = ndimage.binary_opening(foreground, iterations=1)
    foreground = ndimage.binary_erosion(foreground, iterations=1)
    labels, _ = ndimage.label(foreground)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    foreground = labels == sizes.argmax()
    # Photographed webbing can share the backdrop's color. Reviewed outlines
    # replace segmentation only outside the protected apron body.
    for edit in profile.get("strap_outlines", []):
        bounds = profile["strap_regions"][edit["region"]]
        mask = Image.new("L", source.size)
        for path in edit["paths"]:
            translated = [[command[0], *[
                value / edit["scale"] + bounds[(index - 1) % 2]
                for index, value in enumerate(command[1:], 1)
            ]] for command in path if command[0] != "Z"]
            extractor.draw_profile_path(ImageDraw.Draw(mask), translated, sx, sy)
        reviewed = np.asarray(mask.crop(roi)) > 0
        region_image = Image.new("L", source.size)
        ImageDraw.Draw(region_image).rectangle(tuple(value * (sx if index % 2 == 0 else sy) for index, value in enumerate(bounds)), fill=255)
        region = np.asarray(region_image.crop(roi)) > 0
        foreground[region & ~body] = reviewed[region & ~body]
        foreground |= reviewed
    for region in profile.get("preserve_light_regions", []):
        x0, y0, x1, y1 = region
        area = Image.new("L", source.size)
        ImageDraw.Draw(area).rectangle((x0*sx, y0*sy, x1*sx, y1*sy), fill=255)
        foreground |= (np.asarray(area.crop(roi)) > 0) & (red > 115)
    coverage = ndimage.gaussian_filter(foreground.astype(np.float32), 0.55)
    alpha = np.round(foreground * np.clip((coverage - .45) / .5, 0, 1) * 255).astype(np.uint8)
    ys, xs = np.nonzero(alpha)
    box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    cutout = Image.fromarray(np.dstack((rgb, alpha))).crop(box)
    padded = Image.new("RGBA", (cutout.width + 128, cutout.height + 128))
    padded.paste(cutout, (64, 64))
    exports = ROOT / "exports"
    exports.mkdir(parents=True, exist_ok=True)
    path = exports / f"{profile['name']}.png"
    padded.save(path, optimize=True)
    padded.save(path.with_suffix(".webp"), lossless=True, method=6)
    absolute_box = [box[0] + roi[0], box[1] + roi[1], box[2] + roi[0], box[3] + roi[1]]
    record = {**profile, "source_size": list(source.size), "source_crop": absolute_box, "padding": 64, "output_size": list(padded.size)}
    (ROOT / f"{profile['name']}.json").write_text(json.dumps(record, indent=2))
    assert np.array_equal(np.asarray(cutout)[:, :, :3], np.asarray(source.crop(absolute_box)))
    print(profile["name"], padded.size, "original RGB preserved", flush=True)
    return padded


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--intake", type=Path)
    parser.add_argument("names", nargs="*")
    args = parser.parse_args()
    if args.intake:
        ROOT = args.intake
        ATTACHMENTS = ROOT / "originals"
        profiles = json.loads((ROOT / "profiles.json").read_text())
    ROOT.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGB", (1800, 1320), "#27292c")
    for index, profile in enumerate(profiles):
        if not args.names or profile["name"] in args.names:
            cutout = extract(profile)
        else:
            cutout = Image.open(ROOT / "exports" / f"{profile['name']}.png")
        for side, color in enumerate(["#111111", "#eeeeee"]):
            matte = Image.new("RGBA", cutout.size, color)
            matte.alpha_composite(cutout)
            matte.thumbnail((870, 390))
            x, y = side * 900, index * 430
            # Individual side-by-side reviews retain enough resolution for straps.
            review_path = ROOT / "reviews"
            review_path.mkdir(exist_ok=True)
            matte.convert("RGB").save(review_path / f"{profile['name']}-{'dark' if side == 0 else 'light'}.png")
        preview = Image.new("RGBA", cutout.size, "#27292c")
        preview.alpha_composite(cutout)
        preview.thumbnail((860, 370))
        x, y = (index // 3) * 900, (index % 3) * 440
        sheet.paste(preview.convert("RGB"), (x + 20, y + 50))
        ImageDraw.Draw(sheet).text((x + 25, y + 15), profile["name"], fill="white")
    sheet.save(ROOT / "half-aprons-preview.jpg", quality=95)

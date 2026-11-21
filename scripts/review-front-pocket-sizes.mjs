import fs from "node:fs";

// Landmarks inspected on the upright original photos at 1368 x 1824.
// Front-pocket corners are TL, TR, BR, BL; no product images are modified.
const corners = {
  "chocolate-ivory-standard": [[342,1103],[1078,1118],[1098,1528],[302,1497]],
  "seafoam-lavender-standard": [[348,1035],[1070,1034],[1107,1430],[310,1415]],
  "ivory-rust-charcoal-standard": [[316,1042],[1056,1047],[1084,1450],[274,1435]],
  "sage-ivory-burgundy-standard": [[338,1075],[1066,1066],[1090,1456],[314,1459]],
  "mist-ivory-standard": [[308,1149],[1041,1150],[1060,1554],[278,1550]],
  "pearl-burgundy-gold-standard": [[310,1112],[1028,1095],[1066,1482],[284,1500]],
  "periwinkle-bronze-standard": [[306,1101],[1034,1079],[1071,1487],[293,1494]],
  "ivory-indigo-charcoal-standard": [[241,1015],[1038,984],[1080,1426],[210,1447]],
  "ivory-crimson-charcoal-standard": [[299,1057],[1075,1049],[1116,1484],[262,1484]],
  "pearl-linen-standard": [[288,1022],[1059,1048],[1075,1450],[249,1426]],
  "tangerine-blue-standard": [[389,969],[1067,963],[1099,1334],[363,1327]],
  "charcoal-sage-standard": [[298,1147],[1095,1155],[1110,1584],[276,1580]],
  "forest-sunflower-standard": [[272,1213],[1067,1201],[1097,1639],[253,1637]],
  "indigo-ivory-standard": [[260,1215],[1110,1209],[1110,1655],[255,1662]],
};
const previous = JSON.parse(fs.readFileSync("product-intake/standard-sizing/photo-analysis.json", "utf8"));
const designer = fs.readFileSync("src/components/CustomApronDesigner.tsx", "utf8");
const standardTemplates = JSON.parse(fs.readFileSync("src/data/standard-apron-templates.json", "utf8"));
function value(id, property) {
  const block = designer.split(`id: "${id}",`)[1]?.split("},")[0];
  const number = Number(block?.match(new RegExp(`${property}: ([\\d.]+)`))?.[1]);
  if (!(number > 0)) throw new Error(`Missing designer reference ${id}.${property}`);
  return number;
}
const reference = {
  frontPocketWidth: value("large-front-pocket", "width"),
  smallWidth: standardTemplates.small.totalWidth,
  largeWidth: standardTemplates.large.totalWidth,
};
const midpoint = (reference.smallWidth + reference.largeWidth) / 2;
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const results = previous.map(photo => {
  const pocket = corners[photo.slug];
  if (!pocket) return { slug: photo.slug, standardSize: null, reason: "Non-template pocket layout; no divided 16-inch front pocket to compare." };
  const [tl, tr, br, bl] = pocket;
  const topY = (tl[1] + tr[1]) / 2;
  const bottomY = (bl[1] + br[1]) / 2;
  const hemY = (photo.hemEndpoints[0][1] + photo.hemEndpoints[1][1]) / 2;
  // Approximate the local scale at the hem, accounting for a wider near edge.
  // This is not a calibrated camera model or a physical measurement.
  const topWidth = distance(tl, tr), bottomWidth = distance(bl, br);
  const hemScale = bottomWidth + (bottomWidth - topWidth) * (hemY - bottomY) / (bottomY - topY);
  const widthEstimate = distance(...photo.hemEndpoints) / hemScale * reference.frontPocketWidth;
  const size = widthEstimate < midpoint ? "small" : "large";
  const stable = Math.abs(widthEstimate - midpoint) > .5;
  return {
    slug: photo.slug, source: photo.source, frontPocketCorners: pocket,
    frontReferenceWidthInches: reference.frontPocketWidth,
    widthEstimateInches: Number(widthEstimate.toFixed(2)),
    closestTemplate: size, standardSize: stable ? size : null,
    chestReferenceWidthInches: photo.photoWidthInches,
    reason: stable ? "Photo-estimated from front-pocket/body width; assumes the pictured pocket matches the design tool. Not measured." : "Within half an inch of the Small/Large boundary; confirm size.",
  };
});
// User requested best guesses for these three unresolved photos on 2026-10-25.
const bestGuesses = {
  "pearl-burgundy-gold-standard": "Front-pocket width estimate is closer to Large, although within the uncertainty margin.",
  "cobalt-crimson-standard": "Best visual guess: Large from the broad body relative to the separate side pockets. Non-template pockets prevent calibrated sizing.",
  "burgundy-bloom-standard": "Best visual guess: Large from the body-to-chest-pocket proportions. Non-template lower pockets prevent a front-pocket comparison.",
};
for (const product of results) {
  if (!bestGuesses[product.slug]) continue;
  product.standardSize = "large";
  product.bestGuessRequested = true;
  product.reason = bestGuesses[product.slug] + " User-requested low-confidence estimate; not physically verified.";
}
const report = { reference, assumptions: [
  "The divided front pocket is assumed to be 16 inches wide, as in the design tool.",
  "Chest-pocket scale and front-pocket scale disagree in several photos. Pocket variations, drape and perspective prevent confirmed measurements.",
  "Width-based classification is provisional. Do not populate measured dimensions from this report.",
], products: results };
fs.writeFileSync("product-intake/standard-sizing/front-pocket-review.json", JSON.stringify(report, null, 2) + "\n");
console.table(results.map(({ slug, widthEstimateInches, standardSize }) => ({ slug, widthEstimateInches, standardSize })));

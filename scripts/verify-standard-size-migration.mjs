import assert from "node:assert/strict";
import fs from "node:fs";
import { planSizeUpdates } from "./update-standard-sizes.mjs";

const catalog = JSON.parse(fs.readFileSync("src/data/product-catalog.json", "utf8"));
const documents = catalog.map(p => ({
  name: `projects/upgradeaprons/databases/(default)/documents/products/${p.slug}`,
  updateTime: "2026-10-08T01:00:00Z",
  fields: { image: { stringValue: p.image }, sold: { booleanValue: true }, basePrice: { doubleValue: 199 } },
}));
const snapshot = JSON.stringify(documents);
const plan = planSizeUpdates(catalog, documents);
assert.equal(plan.writes.length, 16);
assert.equal(JSON.stringify(documents), snapshot);
for (const write of plan.writes) {
  assert.deepEqual(write.updateMask.fieldPaths, ["standardSize", "standardSizeEstimated"]);
  assert.equal(write.currentDocument.updateTime, documents[0].updateTime);
  assert.equal(write.update.fields.standardSizeEstimated.booleanValue, true);
  assert.equal(write.update.fields.standardSize.stringValue, catalog.find(p => write.update.name.endsWith(`/${p.slug}`)).standardSize);
}
documents[0].fields.standardSize = { stringValue: "small" };
documents[1].fields.standardSize = { nullValue: null };
documents[2].fields.measurements = { mapValue: { fields: {} } };
documents[3].fields.imageUrl = { stringValue: "https://example.com/owner-photo.jpg" };
documents[4].fields.image = { stringValue: "/different-photo.webp" };
assert.equal(planSizeUpdates(catalog, documents).writes.length, 11);
assert.equal(planSizeUpdates(catalog, []).writes.length, 0);
for (const doc of documents) doc.fields.standardSize = { stringValue: "large" };
assert.equal(planSizeUpdates(catalog, documents).writes.length, 0);
const review = JSON.parse(fs.readFileSync("product-intake/standard-sizing/front-pocket-review.json", "utf8")).products;
const oldEstimates = catalog.filter(p => p.categorySlug === "standard").map(p => ({
  name: `projects/upgradeaprons/databases/(default)/documents/products/${p.slug}`,
  updateTime: "2026-10-24T01:00:00Z",
  fields: { image: { stringValue: p.image }, standardSize: { stringValue: "large" }, standardSizeEstimated: { booleanValue: true } },
}));
const revised = planSizeUpdates(catalog, oldEstimates, review);
assert.equal(revised.writes.length, 9);
assert.equal(revised.writes.filter(w => w.update.fields.standardSize.stringValue === "small").length, 9);
assert.equal(revised.writes.filter(w => "nullValue" in w.update.fields.standardSize).length, 0);
for (const write of revised.writes) {
  assert.deepEqual(write.updateMask.fieldPaths, ["standardSize", "standardSizeEstimated"]);
  Object.assign(oldEstimates.find(d => d.name === write.update.name).fields, write.update.fields);
}
assert.equal(planSizeUpdates(catalog, oldEstimates, review).writes.length, 0);
const seafoam = oldEstimates.find(d => d.name.endsWith("seafoam-lavender-standard"));
seafoam.fields.standardSize = { stringValue: "large" };
seafoam.fields.standardSizeEstimated = { booleanValue: false };
assert.equal(planSizeUpdates(catalog, oldEstimates, review).writes.length, 0);
seafoam.fields.standardSizeEstimated = { booleanValue: true };
seafoam.fields.measurements = { mapValue: { fields: { bodyWidthInches: { doubleValue: 22.5 } } } };
assert.equal(planSizeUpdates(catalog, oldEstimates, review).writes.length, 0);
delete seafoam.fields.measurements;
seafoam.fields.imageUrl = { stringValue: "https://example.com/new-photo.jpg" };
assert.equal(planSizeUpdates(catalog, oldEstimates, review).writes.length, 0);
const pending = oldEstimates.filter(d => review.find(r => d.name.endsWith("/" + r.slug))?.bestGuessRequested).map(d => ({
  ...d, fields: { image: d.fields.image, standardSize: { nullValue: null }, standardSizeEstimated: { booleanValue: false } },
}));
assert.equal(pending.length, 3);
assert.equal(planSizeUpdates(catalog, pending, review).writes.length, 0);
const filled = planSizeUpdates(catalog, pending, review, true);
assert.equal(filled.writes.length, 3);
for (const write of filled.writes) {
  assert.equal(write.update.fields.standardSize.stringValue, "large");
  assert.equal(write.update.fields.standardSizeEstimated.booleanValue, true);
  assert.deepEqual(write.updateMask.fieldPaths, ["standardSize", "standardSizeEstimated"]);
}
pending[0].fields.standardSize = { stringValue: "small" };
pending[1].fields.measurements = { mapValue: { fields: {} } };
pending[2].fields.imageUrl = { stringValue: "https://example.com/changed.jpg" };
assert.equal(planSizeUpdates(catalog, pending, review, true).writes.length, 0);
console.log("PASS: user-requested pending guesses, idempotency, owner sizes, measurements, photos, prices and sold status preserved.");

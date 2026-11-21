import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const compile = (file, mocks = {}, globals = {}) => {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(code, { exports, require: id => mocks[id] ?? require(id), ...globals });
  return exports;
};
const products = JSON.parse(fs.readFileSync("src/data/product-catalog.json", "utf8"));
const base = products.find(p => p.standardSize === "large" && p.standardSizeEstimated);
const custom = products.find(p => p.showcaseOnly);
const sizing = compile("src/lib/product-sizing.ts");
const pricing = compile("src/lib/product-pricing.ts");
const catalog = compile("src/lib/product-catalog.ts", {
  "@/lib/firebase": {}, "@/lib/product-pricing": pricing, "@/lib/product-sizing": sizing,
});
assert.equal(sizing.normalizeStandardSize("small"), "small");
assert.equal(sizing.normalizeStandardSize("large"), "large");
for (const value of [null, undefined, "medium", 42, "Small"]) assert.equal(sizing.normalizeStandardSize(value), null);
for (const value of [null, {}, { bodyWidthInches: "20", bodyLengthInches: 30 }, { bodyWidthInches: 0, bodyLengthInches: 30 }, { bodyWidthInches: 20, bodyLengthInches: Infinity }]) assert.equal(sizing.normalizeMeasurements(value), null);
const small = catalog.normalizeProductRecord(base, { standardSize: "small", measurements: { bodyWidthInches: 22, bodyLengthInches: 28 } });
const large = catalog.normalizeProductRecord(base, { standardSize: "large", measurements: { bodyWidthInches: 28, bodyLengthInches: 34 } });
assert.equal(small.standardSize, "small");
assert.equal(large.standardSize, "large");
assert.equal(pricing.getProductPrice(small), pricing.getProductPrice(large));
assert.equal(catalog.normalizeProductRecord(small, { standardSize: null, measurements: null }).measurements, null);
assert.equal(catalog.normalizeProductRecord(base, {}).measurements, null);
assert.equal(catalog.normalizeProductRecord(base, {}).standardSizeEstimated, true);
assert.equal(catalog.normalizeProductRecord(base, null).standardSizeEstimated, true);
assert.equal(catalog.normalizeProductRecord(base, { standardSize: "small" }).standardSizeEstimated, false);
assert.equal(catalog.normalizeProductRecord(base, { standardSize: null }).standardSizeEstimated, false);
assert.equal(catalog.normalizeProductRecord(base, { standardSize: "large", standardSizeEstimated: false }).standardSizeEstimated, false);
assert.equal(sizing.getStandardSizeLabel(base), "Large");
assert.equal(sizing.getStandardSizeLabel(small), "Small");
assert.equal(sizing.getStandardSizeLabel({ standardSize: null, standardSizeEstimated: true }), "Size to be confirmed");
assert.equal(catalog.normalizeProductRecord(custom, { sold: false }).sold, true);
assert.equal(sizing.formatMeasurement(22), "22 in / 55.9 cm");
const { ApronMeasurements } = compile("src/components/ApronMeasurements.tsx", {
  "@/data/standard-apron-templates.json": { default: JSON.parse(fs.readFileSync("src/data/standard-apron-templates.json", "utf8")) },
  "@/lib/product-sizing": sizing, "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
});
const diagram = renderToStaticMarkup(React.createElement(ApronMeasurements, { product: small }));
assert.match(diagram, /22 in \/ 55.9 cm/);
assert.match(diagram, /28 in \/ 71.1 cm/);
assert.match(diagram, /Small/);
const renderFit = product => renderToStaticMarkup(React.createElement(ApronMeasurements, { product }));
const largeTemplate = renderFit(base);
assert.match(largeTemplate, /22.5 in \/ 57.1 cm/);
assert.match(largeTemplate, /28 in \/ 71.1 cm/);
assert.match(largeTemplate, /9 in \/ 22.9 cm/);
assert.match(largeTemplate, /Design-tool template dimensions/);
assert.doesNotMatch(largeTemplate, /Not yet measured|estimated|Measured flat/);
const smallTemplate = renderFit({ ...base, standardSize: "small" });
assert.match(smallTemplate, /20.5 in \/ 52.1 cm/);
assert.match(smallTemplate, /26 in \/ 66 cm/);
assert.match(smallTemplate, /7.5 in \/ 19.1 cm/);
assert.match(smallTemplate, /data-standard-size-diagram/);
assert.notEqual(smallTemplate.match(/d="([^"]+)"[^>]*data-apron-outline/)[1], largeTemplate.match(/d="([^"]+)"[^>]*data-apron-outline/)[1]);
assert.match(renderFit({ ...base, standardSize: null }), /Not yet measured/);
assert.match(renderFit(custom), /Not yet measured/);
assert.match(renderFit(products.find(p => p.categorySlug === "half-apron")), /Not yet measured/);
assert.match(diagram, /Body measured flat/);
assert.doesNotMatch(diagram, /Design-tool template dimensions/);
assert.doesNotMatch(diagram, /Size estimated from the photo/);
const estimates = products.filter(product => product.standardSizeEstimated);
assert.equal(estimates.length, 16);
assert(estimates.every(product => product.categorySlug === "standard" && !product.measurements));
assert.equal(estimates.filter(product => product.standardSize === "small").length, 9);
assert.equal(estimates.filter(product => product.standardSize === "large").length, 7);
assert.equal(products.filter(product => product.categorySlug === "standard" && !product.standardSize).length, 0);
const review = JSON.parse(fs.readFileSync("product-intake/standard-sizing/front-pocket-review.json", "utf8"));
assert.equal(review.products.length, 16);
for (const product of estimates) {
  assert.equal(product.standardSize ?? null, review.products.find(r => r.slug === product.slug).standardSize);
}
const { StandardSizeFilter } = compile("src/components/StandardSizeFilter.tsx");
let selection;
const filters = StandardSizeFilter({ products: [small, large, base], value: "all", onChange: value => { selection = value; } });
function find(tree, type) {
  if (!tree || typeof tree !== "object") return null;
  if (tree.type === type) return tree;
  for (const child of React.Children.toArray(tree.props?.children)) { const found = find(child, type); if (found) return found; }
  return null;
}
find(filters, "button").props.onClick();
assert.equal(selection, "all");
assert.match(renderToStaticMarkup(filters), /All sizes/);

const states = [], refs = [], effects = [];
let stateIndex = 0, refIndex = 0, initial = true, callback, fail = false, release;
const auth = { currentUser: null };
const writes = [];
const { ProductFitControl } = compile("src/components/ProductFitControl.tsx", {
  react: { ...React,
    useState(value) { const i = stateIndex++; if (!(i in states)) states[i] = value; return [states[i], next => { states[i] = next; }]; },
    useRef(value) { const i = refIndex++; return refs[i] ??= { current: value }; },
    useEffect(fn) { if (initial) effects.push(fn); },
  },
  "@/lib/product-sizing": sizing,
  "@/lib/product-catalog": catalog,
  "@/lib/firebase": { getFirebaseAuth: async () => auth, getFirebaseFirestore: async () => ({}) },
  "firebase/auth": { onAuthStateChanged(_auth, cb) { callback = cb; cb(auth.currentUser); return () => {}; } },
  "firebase/firestore": {
    doc: (_db, collection, slug) => `${collection}/${slug}`,
    serverTimestamp: () => "timestamp",
    updateDoc: async (path, patch) => { if (fail) throw new Error("offline"); writes.push({ path, patch }); await new Promise(resolve => { release = resolve; }); },
  },
}, { FormData: class { constructor(values) { this.values = values; } get(key) { return this.values[key] ?? ""; } } });
const render = (product = base, catalogReady = true) => { stateIndex = refIndex = 0; const tree = ProductFitControl({ product, catalogReady }); initial = false; return tree; };
const tick = async () => { for (let i = 0; i < 25; i++) await Promise.resolve(); };
const submit = async (values, product = base, ready = true) => { const form = find(render(product, ready), "form"); form.props.onSubmit({ preventDefault() {}, currentTarget: values }); await tick(); };
assert.equal(render(), null);
const cleanup = effects[0](); await tick();
auth.currentUser = { email: "customer@example.com" }; callback(auth.currentUser); assert.equal(render(), null);
auth.currentUser = { email: "upgrade@whidbey.com" }; callback(auth.currentUser);
assert.equal(find(render(base, false), "fieldset").props.disabled, true);
await submit({ bodyWidth: "22", bodyLength: "28", standardSize: "small" }, base, false); assert.equal(writes.length, 0);
await submit({ bodyWidth: "22", bodyLength: "" }); assert.equal(writes.length, 0);
await submit({ bodyWidth: "22", bodyLength: "28", standardSize: "small", sizeConfirmed: "on" });
assert.equal(writes.length, 1);
assert.equal(writes[0].path, `products/${base.slug}`);
assert.deepEqual(Object.keys(writes[0].patch).sort(), ["measurements", "standardSize", "standardSizeEstimated", "updatedAt"]);
assert.equal(writes[0].patch.measurements.bodyWidthInches, 22);
assert.equal(writes[0].patch.standardSize, "small");
assert.equal(writes[0].patch.standardSizeEstimated, false);
assert.equal(find(render(), "fieldset").props.disabled, true);
await submit({ bodyWidth: "28", bodyLength: "34", standardSize: "large" }); assert.equal(writes.length, 1);
release(); await tick(); assert.match(renderToStaticMarkup(render()), /measurements saved/);
await submit({ bodyWidth: "", bodyLength: "", standardSize: "" });
assert.equal(writes[1].patch.measurements, null); assert.equal(writes[1].patch.standardSize, null); release(); await tick();
assert.equal(writes[1].patch.standardSizeEstimated, false);
await submit({ bodyWidth: "24", bodyLength: "12" }, products.find(p => p.categorySlug === "half-apron"));
assert.equal("standardSize" in writes[2].patch, false); release(); await tick();
assert.equal("standardSizeEstimated" in writes[2].patch, false);
fail = true; await submit({ bodyWidth: "22", bodyLength: "28" }); assert.match(renderToStaticMarkup(render()), /Could not save/);
auth.currentUser = null; await submit({ bodyWidth: "22", bodyLength: "28" }); assert.equal(writes.length, 3);
callback(null); assert.equal(render(), null); cleanup();
console.log("PASS: validated sizes, unchanged prices, measured/unmeasured diagrams, owner-only edits, narrow writes, clearing, loading, duplicate submission, error and sign-out handling.");

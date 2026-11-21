import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const compile = (file, mocks = {}) => {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(code, { exports, require: (id) => mocks[id] ?? require(id) });
  return exports;
};
const pricing = compile('src/lib/product-pricing.ts');
const sizing = compile('src/lib/product-sizing.ts');
const catalog = compile('src/lib/product-catalog.ts', {
  '@/lib/firebase': {}, '@/lib/product-pricing': pricing,
  '@/lib/product-sizing': sizing,
});
const products = JSON.parse(fs.readFileSync('src/data/product-catalog.json', 'utf8'));
const product = products[0];
assert.equal(catalog.normalizeProductRecord(product, null).sold, false);
assert.equal(catalog.normalizeProductRecord(product, { sold: true }).sold, true);
assert.equal(catalog.normalizeProductRecord({ ...product, sold: true }, { sold: false }).sold, false);
assert.equal(catalog.normalizeProductRecord(product, { sold: 'true' }).sold, false);
assert.equal(catalog.mergeProductCatalog(products, [{ slug: product.slug, sold: true }])[0].sold, true);
for (const [category, price] of [['standard', 175], ['half-apron', 125], ['crossback', 225]]) {
  assert.equal(pricing.getProductPriceLabel(products.find(p => p.categorySlug === category)), `$${price} plus tax`);
}

const states = [], refs = [], effects = [];
let stateIndex, refIndex, initialRender = true, authCallback, failSave = false;
let releaseWrite;
const writes = [];
const auth = { currentUser: null };
const Control = compile('src/components/ProductSoldControl.tsx', {
  react: { ...React,
    useState(initial) {
      const i = stateIndex++;
      if (!(i in states)) states[i] = initial;
      return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }];
    },
    useRef(initial) { const i = refIndex++; return refs[i] ??= { current: initial }; },
    useEffect(fn) { if (initialRender) effects.push(fn); },
  },
  '@/lib/firebase': { getFirebaseAuth: async () => auth, getFirebaseFirestore: async () => ({}) },
  '@/lib/product-catalog': catalog,
  'firebase/auth': { onAuthStateChanged(_auth, callback) { authCallback = callback; callback(auth.currentUser); return () => {}; } },
  'firebase/firestore': {
    doc: (_db, collection, slug) => `${collection}/${slug}`,
    serverTimestamp: () => 'server-timestamp',
    async updateDoc(path, patch) {
      if (failSave) throw new Error('permission-denied');
      writes.push({ path, patch });
      await new Promise(resolve => { releaseWrite = resolve; });
    },
  },
}).ProductSoldControl;
const render = (sold = false, catalogReady = true) => {
  stateIndex = refIndex = 0;
  const tree = Control({ product: { ...product, sold }, catalogReady });
  initialRender = false;
  return tree;
};
const findInput = tree => {
  if (!tree || typeof tree !== 'object') return null;
  if (tree.type === 'input') return tree;
  for (const child of React.Children.toArray(tree.props?.children)) {
    const found = findInput(child); if (found) return found;
  }
  return null;
};
const tick = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
assert.equal(render(), null);
const cleanup = effects[0](); await tick();
auth.currentUser = { email: 'customer@example.com' }; authCallback(auth.currentUser);
assert.equal(render(), null, 'Other signed-in customers have no control');
auth.currentUser = { email: 'upgrade@whidbey.com' }; authCallback(auth.currentUser);
assert.equal(findInput(render()).props.checked, false);
assert.equal(findInput(render(false, false)).props.disabled, true, 'Cannot write while catalog is loading');
findInput(render()).props.onChange({ target: { checked: true } }); await tick();
assert.equal(findInput(render()).props.disabled, true, 'Disable while saving');
assert.equal(writes.length, 1);
assert.equal(writes[0].path, `products/${product.slug}`);
assert.deepEqual(Object.keys(writes[0].patch).sort(), ['sold', 'updatedAt']);
assert.equal(writes[0].patch.sold, true);
findInput(render()).props.onChange({ target: { checked: false } }); await tick();
assert.equal(writes.length, 1, 'Ignore rapid repeated changes');
releaseWrite(); await tick();
assert(renderToStaticMarkup(render(true)).includes('Marked as sold.'));
const ownerMarkup = renderToStaticMarkup(render(true));
findInput(render(true)).props.onChange({ target: { checked: false } }); await tick();
assert.equal(writes[1].patch.sold, false); releaseWrite(); await tick();
assert(renderToStaticMarkup(render()).includes('Marked as available.'));
failSave = true;
findInput(render()).props.onChange({ target: { checked: true } }); await tick();
assert.equal(findInput(render()).props.checked, false);
assert.equal(findInput(render()).props.disabled, false);
assert(renderToStaticMarkup(render()).includes('Could not save'));
failSave = false;
auth.currentUser = null;
findInput(render()).props.onChange({ target: { checked: true } }); await tick();
assert.equal(writes.length, 2, 'Recheck auth immediately before writing');
authCallback(null); assert.equal(render(), null); cleanup();

const { SoldBadge } = compile('src/components/SoldBadge.tsx');
const { ProductImageViewer } = compile('src/components/ProductImageViewer.tsx', {
  '@/components/SoldBadge': { SoldBadge },
  'next/image': { default: ({ src, alt }) => React.createElement('img', { src, alt }) },
  'framer-motion': { AnimatePresence: ({ children }) => children, motion: { div: 'div' }, useReducedMotion: () => true },
});
const soldImage = renderToStaticMarkup(React.createElement(ProductImageViewer, {
  src: product.image, alt: product.title, sizes: '100vw', sold: true,
  frameClassName: 'aspect-[0.82] overflow-hidden rounded-lg bg-[#18110d]',
  imageClassName: 'object-contain p-7',
}));
assert(soldImage.includes('data-sold-badge') && soldImage.includes('SOLD'));
assert(!renderToStaticMarkup(React.createElement(ProductImageViewer, { src: product.image, alt: product.title, sizes: '100vw' })).includes('data-sold-badge'));
fs.mkdirSync('tmp/catalog-ui-review', { recursive: true });
fs.writeFileSync('tmp/catalog-ui-review/sold-fixture.html', `<main style="max-width:440px;margin:24px auto;padding:0 16px">${soldImage}${ownerMarkup}</main>`);
console.log('PASS: availability normalization, all category prices, owner/guest access, save/unsell, duplicate guard, failure recovery, session recheck and SOLD badge. No production data changed.');

import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { pathToFileURL } from 'node:url';

const exports = {};
const code = ts.transpileModule(fs.readFileSync('src/lib/product-text.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
vm.runInNewContext(code, { exports });
const { getProductSpecDisplayValue } = exports;
for (const [value, expected] of [['5 compartments', '5'], ['4 pockets', '4'], ['1 compartment', '1'], ['1 pocket', '1'], ['6', '6'], [' 12 Compartments ', '12'], ['Custom layout', 'Custom layout']]) {
  assert.equal(getProductSpecDisplayValue({ label: 'Pockets', value }), expected);
}
assert.equal(getProductSpecDisplayValue({ label: 'Build', value: 'Full apron' }), 'Full apron');
const catalog = JSON.parse(fs.readFileSync('src/data/product-catalog.json', 'utf8'));
for (const product of catalog) {
  const pockets = product.specs.find(spec => spec.label === 'Pockets');
  if (product.showcaseOnly && !pockets) continue;
  assert.ok(pockets, product.slug);
  assert.match(getProductSpecDisplayValue(pockets), /^\d+$/);
}
console.log('PASS: pocket counts are numeric and other product specifications stay unchanged.');
if (!process.argv[2]) process.exit(0);

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'http://127.0.0.1:3027';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  for (const product of [catalog.find((item) => item.slug === 'burgundy-classic-crossback'), catalog[0], catalog.find((item) => item.categorySlug === 'half-apron')]) {
    const suffix = ['127.0.0.1', 'localhost'].includes(new URL(base).hostname) ? '.html' : '';
    await page.goto(`${base}/products/${product.categorySlug}/${product.slug}${suffix}`, { waitUntil: 'domcontentloaded' });
    const label = page.locator('[data-product-field="specs"][data-product-part="label"]').filter({ hasText: /^Pockets$/ });
    const index = await label.getAttribute('data-product-index');
    const value = page.locator(`[data-product-field="specs"][data-product-index="${index}"][data-product-part="value"]`).first();
    assert.match((await value.textContent()).trim(), /^\d+$/);
    for (const width of [320, 390, 640, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert(await value.evaluate((element) => {
        const card = element.parentElement.parentElement;
        const text = element.getBoundingClientRect();
        const bounds = card.getBoundingClientRect();
        return text.left >= bounds.left && text.right <= bounds.right && text.bottom <= bounds.bottom;
      }), `Pocket count fits at ${width}px`);
    }
  }
  console.log('PASS: numeric pocket counts fit the product cards at phone, tablet, and desktop widths.');
} finally {
  await browser.close();
}

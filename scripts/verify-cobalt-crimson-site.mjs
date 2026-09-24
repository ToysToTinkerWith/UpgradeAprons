import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'http://localhost:3000';
const catalog = JSON.parse(fs.readFileSync('src/data/product-catalog.json', 'utf8'));
const standards = catalog.filter((product) => product.categorySlug === 'standard');
const product = standards.find((item) => item.slug === 'cobalt-crimson-standard');
assert(product);
assert.equal(standards.length, 2);
assert.equal(new Set(catalog.map((item) => item.slug)).size, catalog.length);
const root = 'tmp/cobalt-crimson-site-review';
fs.mkdirSync(root, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/products`, { waitUntil: 'load' });
  await page.waitForFunction((count) => document.querySelectorAll('[data-product-slug]').length === count, catalog.length);
  await page.getByRole('button', { name: /^Standard\s+2$/ }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-product-slug]').length === 2);
  assert.deepEqual(await page.locator('[data-product-slug]').evaluateAll((items) => items.map((item) => item.dataset.productSlug).sort()), standards.map((item) => item.slug).sort());
  await page.goto(`${base}/products/standard`, { waitUntil: 'load' });
  assert.equal(await page.locator('[data-product-slug]').count(), 2);
  const response = await page.goto(`${base}/products/standard/${product.slug}`, { waitUntil: 'load' });
  assert.equal(response.status(), 200);
  await page.getByRole('heading', { name: product.title, exact: true }).waitFor();
  assert((await page.locator('main').innerText()).includes('$175'));
  const button = page.getByRole('button', { name: `View ${product.title} full screen`, exact: true });
  const img = button.locator('img');
  await img.evaluate(async (image) => { await image.decode(); });
  assert.equal(await img.evaluate((image) => new URL(image.currentSrc).pathname), product.image);
  const pixels = await img.evaluate((image) => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const alphaAt = (x, y) => ctx.getImageData(64 + Math.round(x * 2880 / 1368),64 + Math.round(y * 3840 / 1824),1,1).data[3];
    return { size: [canvas.width,canvas.height], corner: ctx.getImageData(0,0,1,1).data[3], neckGap: alphaAt(650,160), neck: alphaAt(650,80), leftTie: alphaAt(45,1500), rightTie: alphaAt(1325,1600) };
  });
  assert.deepEqual(pixels, { size: [3008,3968], corner: 0, neckGap: 0, neck: 255, leftTie: 255, rightTie: 255 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${root}/desktop.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await button.click();
  await page.getByRole('dialog').locator('img').evaluate(async (image) => { await image.decode(); });
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${root}/mobile.png` });
  await page.keyboard.press('Escape');
  assert.deepEqual(errors, []);
  console.log('PASS: two Standards, existing products retained, new $175 product, transparent image with intact straps, desktop/mobile, no runtime errors.');
} finally {
  await browser.close();
}

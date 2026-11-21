import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'http://localhost:3003';
const catalog = JSON.parse(fs.readFileSync('src/data/product-catalog.json', 'utf8'));
const standards = catalog.filter((product) => product.categorySlug === 'standard');
const slugs = ['charcoal-sage-standard', 'forest-sunflower-standard', 'indigo-ivory-standard'];
const root = 'tmp/september-products-review';
fs.mkdirSync(root, { recursive: true });
assert.equal(standards.length, 5);
assert.equal(catalog.length, 15);
assert.equal(new Set(catalog.map((product) => product.slug)).size, catalog.length);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/products`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction((count) => document.querySelectorAll('[data-product-slug]').length === count, catalog.length);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('h1')).opacity === '1');
  await page.getByRole('button', { name: /^Standard\s+5$/ }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-product-slug]').length === 5);
  assert.deepEqual(await page.locator('[data-product-slug]').evaluateAll((items) => items.map((item) => item.dataset.productSlug).sort()), standards.map((item) => item.slug).sort());
  await page.goto(`${base}/products/standard`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('[data-product-slug]').length === 5);
  await page.locator('[data-product-slug] img').evaluateAll(async (images) => { await Promise.all(images.map((image) => image.decode())); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${root}/standard-category.png`, fullPage: true });
  for (const slug of slugs) {
    const product = catalog.find((item) => item.slug === slug);
    const response = await page.goto(`${base}/products/standard/${slug}`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.getByRole('heading', { name: product.title, exact: true }).waitFor();
    assert((await page.locator('main').innerText()).includes('$175'));
    assert.equal(product.specs.find((spec) => spec.label === 'Pockets').value, '4');
    const button = page.getByRole('button', { name: `View ${product.title} full screen`, exact: true });
    const image = button.locator('img');
    await image.evaluate(async (element) => { await element.decode(); });
    assert.equal(await image.evaluate((element) => new URL(element.currentSrc).pathname), product.image);
    const pixels = await image.evaluate((element) => {
      const canvas = document.createElement('canvas');
      canvas.width = element.naturalWidth;
      canvas.height = element.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(element, 0, 0);
      const alpha = (x, y) => ctx.getImageData(64 + Math.round(x * 2160 / 1368), 64 + Math.round(y * 2880 / 1824), 1, 1).data[3];
      return { width: canvas.width, height: canvas.height, corner: ctx.getImageData(0,0,1,1).data[3], neckGap: alpha(670,250), body: alpha(650,1000), lowerPocket: alpha(650,1450) };
    });
    assert.deepEqual(pixels, { width: 2288, height: 3008, corner: 0, neckGap: 0, body: 255, lowerPocket: 255 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${root}/${slug}-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await button.click();
    await page.getByRole('dialog').locator('img').evaluate(async (element) => { await element.decode(); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${root}/${slug}-mobile.png` });
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1440, height: 1000 });
    console.log(`PASS: ${product.title}, $175, four pockets, transparent image, desktop/mobile and image viewer.`);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: 15 products, five Standards, all existing products retained, no browser runtime errors.');
} finally {
  await browser.close();
}

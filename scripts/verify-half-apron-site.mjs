import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'http://localhost:3000';
const catalog = JSON.parse(fs.readFileSync('src/data/product-catalog.json', 'utf8'));
const halves = catalog.filter((product) => product.categorySlug === 'half-apron');
assert.equal(halves.length, 5);
assert.equal(new Set(catalog.map((product) => product.slug)).size, catalog.length);
const root = 'tmp/half-apron-site-review';
fs.mkdirSync(root, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/products`, { waitUntil: 'load' });
  await page.waitForFunction((count) => document.querySelectorAll('[data-product-slug]').length === count, catalog.length);
  await page.getByRole('button', { name: /^Half-Aprons\s+5$/ }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-product-slug]').length === 5);
  assert.deepEqual(await page.locator('[data-product-slug]').evaluateAll((items) => items.map((item) => item.dataset.productSlug).sort()), halves.map((product) => product.slug).sort());
  await page.goto(`${base}/products/half-apron`, { waitUntil: 'load' });
  assert.equal(await page.locator('[data-product-slug]').count(), 5);
  for (const product of halves) {
    const response = await page.goto(`${base}/products/half-apron/${product.slug}`, { waitUntil: 'load' });
    assert.equal(response.status(), 200);
    await page.getByRole('heading', { name: product.title, exact: true }).waitFor();
    assert((await page.locator('main').innerText()).includes('$125'));
    const button = page.getByRole('button', { name: `View ${product.title} full screen`, exact: true });
    const img = button.locator('img');
    await img.evaluate(async (image) => { await image.decode(); });
    assert.equal(await img.evaluate((image) => new URL(image.currentSrc).pathname), product.image);
    const alpha = await img.evaluate((image) => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      return [ctx.getImageData(0,0,1,1).data[3], ctx.getImageData(canvas.width / 2,canvas.height / 2,1,1).data[3]];
    });
    assert.deepEqual(alpha, [0,255]);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${root}/${product.slug}-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await button.click();
    await page.getByRole('dialog').locator('img').evaluate(async (image) => { await image.decode(); });
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${root}/${product.slug}-mobile.png` });
    await page.keyboard.press('Escape');
    if (product.alternateImages?.length) {
      const alternate = page.getByRole('button', { name: `View ${product.title}, alternate view 1 full screen`, exact: true });
      await alternate.click();
      const full = page.getByRole('dialog').locator('img');
      await full.evaluate(async (image) => { await image.decode(); });
      assert.equal(await full.evaluate((image) => new URL(image.currentSrc).pathname), product.alternateImages[0]);
      await page.keyboard.press('Escape');
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  assert.deepEqual(errors, []);
  console.log('PASS: five half-aprons, $125 pricing, transparent product images, alternate sage photo, desktop/mobile, no runtime errors.');
} finally {
  await browser.close();
}

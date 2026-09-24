import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'http://localhost:3000';
const catalog = JSON.parse(fs.readFileSync('src/data/product-catalog.json', 'utf8'));
const products = catalog.filter((product) => product.categorySlug === 'crossback');
assert.equal(products.length, 5);
fs.mkdirSync('tmp/crossback-review/browser', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto(`${base}/products`, { waitUntil: 'load' });
  await page.waitForFunction((count) => document.querySelectorAll('[data-product-slug]').length === count, catalog.length);
  assert.equal(await page.locator('[data-product-slug]').count(), catalog.length);
  const filter = page.getByRole('button', { name: /^Crossback/ });
  await filter.click();
  await page.waitForFunction(() => document.querySelectorAll('[data-product-slug]').length === 5);
  assert.equal(await filter.getAttribute('aria-pressed'), 'true');
  await page.screenshot({ path: 'tmp/crossback-review/browser/catalog-desktop.png', fullPage: true });
  await page.goto(`${base}/products/crossback`, { waitUntil: 'load' });
  await page.getByRole('heading', { name: 'Crossback', exact: true }).waitFor();
  assert.equal(await page.locator('[data-product-slug]').count(), 5);
  for (const product of products) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const response = await page.goto(`${base}/products/crossback/${product.slug}`, { waitUntil: 'load' });
    assert.equal(response.status(), 200);
    await page.getByRole('heading', { name: product.title, exact: true }).waitFor();
    const button = page.getByRole('button', { name: `View ${product.title} full screen`, exact: true });
    const img = button.locator('img');
    await page.waitForFunction(({ title, image }) => {
      return [...document.images].some((item) => item.alt === title && new URL(item.currentSrc || item.src).pathname === image);
    }, { title: product.title, image: product.image });
    await img.evaluate(async (image) => { await image.decode(); });
    assert.equal(await img.evaluate((image) => new URL(image.currentSrc || image.src).pathname), product.image);
    const pixelCheck = await img.evaluate((image) => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      const leftTieGapAlpha = [[135, 803], [30, 1640], [24, 1670]].map(([x, y]) =>
        context.getImageData(64 + Math.round(x * 2880 / 1368), 64 + Math.round(y * 3840 / 1824), 1, 1).data[3]);
      return { width: canvas.width, height: canvas.height, corner: [...context.getImageData(0, 0, 1, 1).data], center: [...context.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data], leftTieGapAlpha };
    });
    assert.deepEqual([pixelCheck.width, pixelCheck.height], [3008, 3968]);
    assert.equal(pixelCheck.corner[3], 0);
    assert.equal(pixelCheck.center[3], 255);
    if (product.slug === 'forest-mosaic-crossback') assert.deepEqual(pixelCheck.leftTieGapAlpha, [0, 0, 0]);
    assert.equal(await img.evaluate((image) => getComputedStyle(image).objectFit), 'contain');
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction((title) => {
      const image = [...document.images].find((item) => item.alt === title);
      for (let node = image; node; node = node.parentElement) {
        if (Number(getComputedStyle(node).opacity) < 0.98) return false;
      }
      return Boolean(image);
    }, product.title);
    await page.screenshot({ path: `tmp/crossback-review/browser/${product.slug}-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await button.click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    await dialog.locator('img').evaluate(async (image) => { await image.decode(); });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `tmp/crossback-review/browser/${product.slug}-mobile.png` });
    await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors, []);
  console.log('PASS: six products, five Crossbacks, category filter and route, all five detail pages, transparent images, desktop/mobile, no runtime errors.');
} finally {
  await browser.close();
}

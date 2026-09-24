import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'http://localhost:3000';
const catalog = JSON.parse(fs.readFileSync('src/data/product-catalog.json', 'utf8'));
const halfCount = catalog.filter((product) => product.categorySlug === 'half-apron').length;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
fs.mkdirSync('tmp/new-catalog-review', { recursive: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto(`${base}/products`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-product-slug="burgundy-bloom-standard"]').waitFor();
  assert.equal(await page.locator('[data-product-slug]').count(), catalog.length);
  await page.getByRole('button', { name: /Half-Aprons/ }).click();
  await page.waitForFunction((count) => document.querySelectorAll('[data-product-slug]').length === count, halfCount);
  assert.equal(await page.locator('[data-product-slug]').count(), halfCount);
  await page.goto(`${base}/products/half-apron`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Half-Aprons', exact: true }).waitFor();
  assert.equal(await page.locator('[data-product-slug]').count(), halfCount);
  await page.goto(`${base}/products/standard/burgundy-bloom-standard`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Burgundy Bloom Standard', exact: true }).waitFor();
  await page.waitForFunction(() => {
    const image = document.querySelector('img[src*="burgundy-bloom-standard-v3.webp"]');
    return image?.complete && image.naturalWidth > 0;
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'tmp/new-catalog-review/product-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'tmp/new-catalog-review/product-mobile.png' });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  const photoButton = page.getByRole('button', { name: 'View Burgundy Bloom Standard full screen', exact: true });
  assert.notEqual(await photoButton.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(217, 220, 218)');
  await photoButton.click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  const backdrop = await dialog.evaluate((element) => {
    const context = document.createElement('canvas').getContext('2d');
    context.fillStyle = getComputedStyle(element).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data];
  });
  assert(backdrop.slice(0, 3).every((channel) => channel < 10));
  assert(backdrop[3] >= 240);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tmp/new-catalog-review/product-mobile-fullscreen.png' });
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  const oldRoute = await page.request.get(`${base}/products/standard/burgundy-tooled-red-standard`);
  assert.equal(oldRoute.status(), 404);
  assert.deepEqual(errors, []);
  console.log('PASS: catalog listings, half-apron category, loaded image, mobile width, old route 404, no runtime errors.');
} catch (error) {
  await page.screenshot({ path: 'tmp/new-catalog-review/verification-failure.png', fullPage: true });
  console.error((await page.locator('main').innerText()).slice(0, 2500));
  throw error;
} finally {
  await browser.close();
}

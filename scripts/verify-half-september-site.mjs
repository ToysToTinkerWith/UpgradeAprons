import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'http://localhost:3003';
const catalog = JSON.parse(fs.readFileSync('src/data/product-catalog.json', 'utf8'));
const profiles = JSON.parse(fs.readFileSync('product-intake/half-september/profiles.json', 'utf8'));
const halves = catalog.filter((product) => product.categorySlug === 'half-apron');
const root = 'tmp/half-september-site-review';
fs.mkdirSync(root, { recursive: true });
assert.equal(halves.length, 11);
assert.equal(catalog.length, 21);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(30000);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/products`, { waitUntil: 'domcontentloaded' });
  console.log('Loaded products page.');
  await page.waitForFunction((count) => document.querySelectorAll('[data-product-slug]').length === count, catalog.length);
  console.log('Found 21 products.');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('h1')).opacity === '1');
  await page.getByRole('button', { name: /^Half-Aprons\s+11$/ }).click();
  console.log('Selected Half-Aprons.');
  await page.waitForFunction(() => document.querySelectorAll('[data-product-slug]').length === 11);
  assert.deepEqual(await page.locator('[data-product-slug]').evaluateAll((items) => items.map((item) => item.dataset.productSlug).sort()), halves.map((item) => item.slug).sort());
  await page.goto(`${base}/products/half-apron`, { waitUntil: 'domcontentloaded' });
  console.log('Loaded Half-Aprons category.');
  await page.waitForFunction(() => document.querySelectorAll('[data-product-slug]').length === 11);
  await page.locator('[data-product-slug] img').evaluateAll(async (images) => {
    await Promise.all(images.map((image) => {
      image.loading = 'eager';
      return image.decode();
    }));
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${root}/half-category-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${root}/half-category-mobile.png`, fullPage: true });
  for (const profile of profiles) {
    const product = catalog.find((item) => item.slug === profile.name);
    const response = await page.goto(`${base}/products/half-apron/${product.slug}`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.getByRole('heading', { name: product.title, exact: true }).waitFor();
    assert((await page.locator('main').innerText()).includes('$125'));
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
      return { width: canvas.width, height: canvas.height, corner: ctx.getImageData(0,0,1,1).data[3], body: ctx.getImageData(Math.floor(canvas.width/2),Math.floor(canvas.height*0.6),1,1).data[3] };
    });
    const record = JSON.parse(fs.readFileSync(`product-intake/half-september/${profile.name}.json`, 'utf8'));
    assert.deepEqual(pixels, { width: record.output_size[0], height: record.output_size[1], corner: 0, body: 255 });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${product.title}: overflow at ${width}`);
    }
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${root}/${product.slug}-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${root}/${product.slug}-mobile.png` });
    await button.click();
    await page.getByRole('dialog').locator('img').evaluate(async (element) => { await element.decode(); });
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    console.log(`PASS: ${product.title}, $125, transparent product image, four viewport sizes and full-screen viewer.`);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: 21 products, 11 Half-Aprons, six new product pages, no browser runtime errors.');
} catch (error) {
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      console.log('Failed page state:', page.url(), await page.locator('body').innerText());
      await page.screenshot({ path: `${root}/failure.png` });
    }
  }
  throw error;
} finally {
  await browser.close();
}

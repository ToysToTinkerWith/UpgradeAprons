import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'http://localhost:3004';
const catalog = JSON.parse(fs.readFileSync('src/data/product-catalog.json', 'utf8'));
const intake = process.argv[4] || 'half-october';
const intakeRoot = `product-intake/${intake}`;
const manifest = fs.existsSync(`${intakeRoot}/manifest.json`) ? 'manifest.json' : 'profiles.json';
const profiles = JSON.parse(fs.readFileSync(`${intakeRoot}/${manifest}`, 'utf8'));
const category = catalog.find((item) => item.slug === profiles[0].name).categorySlug;
const output = `tmp/${intake}-site-review`;
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/products/${category}`, { waitUntil: 'domcontentloaded' });
  for (const profile of profiles) {
    await page.locator(`[data-product-slug="${profile.name}"]`).waitFor();
  }
  await page.locator('[data-product-slug] img').evaluateAll(async (images) => {
    for (const image of images) { image.loading = 'eager'; await image.decode(); }
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${output}/category-desktop.png`, fullPage: true });
  for (const profile of profiles) {
    const product = catalog.find((item) => item.slug === profile.name);
    const response = await page.goto(`${base}/products/${category}/${product.slug}`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.getByRole('heading', { name: product.title, exact: true }).waitFor();
    assert((await page.locator('main').innerText()).includes(`$${product.basePrice}`));
    const button = page.getByRole('button', { name: `View ${product.title} full screen`, exact: true });
    const image = button.locator('img');
    await image.evaluate(async (element) => { await element.decode(); });
    assert.equal(await image.evaluate((element) => new URL(element.currentSrc).pathname), product.image);
    const alpha = await image.evaluate((element) => {
      const canvas = document.createElement('canvas');
      canvas.width = element.naturalWidth;
      canvas.height = element.naturalHeight;
      const context = canvas.getContext('2d');
      context.drawImage(element, 0, 0);
      return [context.getImageData(0, 0, 1, 1).data[3], context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height * .65), 1, 1).data[3]];
    });
    assert.deepEqual(alpha, [0, 255]);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${product.slug}: overflow at ${width}`);
    }
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${output}/${product.slug}-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${output}/${product.slug}-mobile.png` });
    await button.click();
    await page.getByRole('dialog').locator('img').evaluate(async (element) => { await element.decode(); });
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    console.log(`PASS ${product.title}: $${product.basePrice}, image, responsive layout and image viewer.`);
  }
  assert.deepEqual(errors, []);
  console.log(`PASS all ${profiles.length} new products; no browser runtime errors.`);
} finally {
  await browser.close();
}

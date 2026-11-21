import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'https://upgradeaprons.web.app';
const catalog = JSON.parse(fs.readFileSync('src/data/product-catalog.json', 'utf8'));
const slugs = ['ivory-slate-crossback', 'pearl-stone-crossback', 'ivory-teal-crossback', 'ivory-trio-half-apron'];
const root = 'tmp/crossback-september-site-review';
fs.mkdirSync(root, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(30000);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/products`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('[data-product-slug]').length === 24);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('h1')).opacity === '1');
  await page.getByRole('button', { name: /^Crossback\s+8$/ }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-product-slug]').length === 8);
  assert.deepEqual(await page.locator('[data-product-slug]').evaluateAll((items) => items.map((item) => item.dataset.productSlug).sort()), catalog.filter((item) => item.categorySlug === 'crossback').map((item) => item.slug).sort());
  await page.goto(`${base}/products/crossback`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('[data-product-slug]').length === 8);
  await page.locator('[data-product-slug] img').evaluateAll(async (images) => {
    await Promise.all(images.map((image) => { image.loading = 'eager'; return image.decode(); }));
  });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${root}/category-desktop.png`, fullPage: true });
  console.log('PASS: 24 live products, eight Crossbacks and functioning category filter.');
  for (const slug of slugs) {
    const product = catalog.find((item) => item.slug === slug);
    const response = await page.goto(`${base}/products/${product.categorySlug}/${slug}`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.getByRole('heading', { name: product.title, exact: true }).waitFor();
    assert((await page.locator('main').innerText()).includes(`$${product.basePrice}`));
    const button = page.getByRole('button', { name: `View ${product.title} full screen`, exact: true });
    const image = button.locator('img');
    await image.evaluate(async (element) => { await element.decode(); });
    assert.equal(await image.evaluate((element) => new URL(element.currentSrc).pathname), product.image);
    const alpha = await image.evaluate((element) => {
      const canvas = document.createElement('canvas');
      canvas.width = element.naturalWidth; canvas.height = element.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(element,0,0);
      return [ctx.getImageData(0,0,1,1).data[3],ctx.getImageData(Math.round(canvas.width*.5),Math.round(canvas.height*.65),1,1).data[3]];
    });
    assert.deepEqual(alpha,[0,255]);
    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:1000});
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.waitForTimeout(1400);
    await page.screenshot({path:`${root}/${slug}-desktop.png`});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:`${root}/${slug}-mobile.png`});
    await button.click();
    await page.getByRole('dialog').locator('img').evaluate(async (element) => { await element.decode(); });
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({state:'hidden'});
    console.log(`PASS ${product.title}: correct versioned image, price, transparent background, four widths and image viewer.`);
  }
  assert.deepEqual(errors,[]);
} catch (error) {
  for (const context of browser.contexts()) for (const page of context.pages()) {
    console.log('Failed page:',page.url(),await page.locator('body').innerText());
    await page.screenshot({path:`${root}/failure.png`});
  }
  throw error;
} finally {
  await browser.close();
}

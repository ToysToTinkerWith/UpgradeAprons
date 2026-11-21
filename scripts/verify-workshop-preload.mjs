import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'http://127.0.0.1:3027';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const readEarly = (page) => page.evaluate(() => window.__upgradeApronsPreload);
try {
  // The preloads must work even when the application JavaScript cannot start.
  for (const blockedStorage of [false, true]) {
    const page = await browser.newPage();
    if (blockedStorage) await page.addInitScript(() => {
      Storage.prototype.getItem = () => { throw new Error('Storage unavailable'); };
      Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
    });
    const requests = new Set();
    page.on('request', (request) => requests.add(new URL(request.url()).pathname));
    await page.route('**/_next/static/**', (route) => new URL(route.request().url()).pathname.endsWith('.js') ? route.abort() : route.continue());
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    const early = await readEarly(page);
    assert.equal(early.consumed, false);
    assert.deepEqual(early.products.map((product) => product.categorySlug).sort(), ['crossback', 'half-apron', 'standard']);
    assert.equal(await page.locator('head link[data-workshop-preload]').count(), 3, 'Only the three selected aprons are preloaded');
    for (const product of early.products) {
      assert(requests.has(new URL(product.image, base).pathname), 'Apron download starts without React hydration');
    }
    assert.equal(await page.locator('[data-workshop-slot]').count(), 0, 'The selected images are requested before the splash renderer runs');
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const selections = [];
  for (let visit = 0; visit < 2; visit++) {
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-workshop-ready="true"]').waitFor();
    const early = await readEarly(page);
    assert.equal(early.consumed, true);
    const rendered = await page.locator('[data-workshop-slot]').evaluateAll((slots) => slots.map((slot) => ({
      slug: slot.dataset.productSlug, categorySlug: slot.dataset.workshopSlot,
      image: slot.querySelector('img').getAttribute('src'),
    })));
    const normalize = (products) => products.map((product) => ({ ...product, image: new URL(product.image, base).href }));
    assert.deepEqual(normalize(rendered), normalize(early.products), 'The splash uses the exact preloaded selection with no image swap');
    selections.push(rendered);
    const style = await page.locator('.workshop-scene').evaluate((element) => ({
      clip: getComputedStyle(element).clipPath,
      before: getComputedStyle(element, '::before').content,
      after: getComputedStyle(element, '::after').content,
      left: element.getBoundingClientRect().left, width: element.getBoundingClientRect().width,
    }));
    assert.deepEqual(style, { clip: 'none', before: 'none', after: 'none', left: 0, width: 390 }, 'Original edge-to-edge background is restored without stitching');
  }
  assert(selections[1].every((product) => product.slug !== selections[0].find((old) => old.categorySlug === product.categorySlug).slug), 'Reload still chooses different aprons');
  assert.deepEqual(errors, [], 'No hydration or runtime errors');
  await page.close();

  const other = await browser.newPage();
  await other.goto(new URL('/about', base).href, { waitUntil: 'domcontentloaded' });
  assert.equal(await other.locator('link[data-workshop-preload]').count(), 0, 'Other pages do not preload homepage products');
  await other.close();
  console.log('PASS: exactly three aprons preload before hydration, renderer reuses them, reload randomization, blocked storage, restored background, and no preloads on other pages.');
} finally {
  await browser.close();
}

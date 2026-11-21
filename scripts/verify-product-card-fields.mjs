import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'http://localhost:3004';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
fs.mkdirSync('tmp/product-card-fields', { recursive: true });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/products`, { waitUntil: 'domcontentloaded' });
    const cards = page.locator('article[data-product-slug]');
    await cards.first().waitFor();
    assert.equal(await cards.locator('[data-product-field="material"], [data-product-field="finish"]').count(), 0);
    assert.equal(await cards.getByText(/^(Material|Finish)$/).count(), 0);
    assert(await cards.first().locator('[data-product-field="title"]').innerText());
    assert.match(await cards.first().innerText(), /\$\d+/);
    await cards.first().getByRole('link', { name: /view details/i }).waitFor();
    for (const category of ['Standard', 'Half-Aprons', 'Crossback', 'All']) {
      const filter = page.getByRole('button', { name: new RegExp(`^${category}\\s+\\d+$`, 'i') });
      await filter.click();
      await cards.first().waitFor();
      assert.equal(await filter.getAttribute('aria-pressed'), 'true');
      assert.equal(await cards.locator('[data-product-field="material"], [data-product-field="finish"]').count(), 0);
    }
    await cards.first().scrollIntoViewIfNeeded();
    await cards.first().locator('img').evaluate((image) => image.decode());
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `tmp/product-card-fields/products-${width}.png` });
    await cards.first().getByRole('link', { name: /view details/i }).click();
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.getByRole('heading', { name: 'Build Details', exact: true }).waitFor();
    assert.equal(await page.locator('main [data-product-field="material"], main [data-product-field="finish"]').count(), 0);
    console.log(`PASS ${width}px: no Material/Finish block; prices, filters and detail links preserved.`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}

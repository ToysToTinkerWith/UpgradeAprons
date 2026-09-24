import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'http://localhost:3000';
const catalog = JSON.parse(fs.readFileSync('src/data/product-catalog.json', 'utf8'));
const crossbacks = catalog.filter((product) => product.categorySlug === 'crossback');
const expected = crossbacks.map((product) => product.slug).sort();
fs.mkdirSync('tmp/category-navigation-review', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base, { waitUntil: 'load' });
    const filters = page.locator('[aria-label="Filter apron styles"]');
    const crossback = filters.getByRole('button', { name: /^Crossback\s+5$/ });
    await crossback.scrollIntoViewIfNeeded();
    assert.equal(await crossback.locator('span[data-site-scope]').getAttribute('data-site-scope'), 'apron-category-crossback');
    await crossback.click();
    assert.equal(await crossback.getAttribute('aria-pressed'), 'true');
    const seen = new Set();
    const dots = page.getByRole('button', { name: /^Show apron page/ });
    for (let index = 0; index < await dots.count(); index++) {
      await dots.nth(index).click();
      const slugs = await page.locator('[data-product-slug]:not([data-workshop-slot])').evaluateAll((items) => items.map((item) => item.dataset.productSlug));
      assert(slugs.length > 0 && slugs.every((slug) => expected.includes(slug)));
      slugs.forEach((slug) => seen.add(slug));
    }
    assert.deepEqual([...seen].sort(), expected);
    await crossback.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `tmp/category-navigation-review/home-${viewport.width}.png` });
    const standards = catalog.filter((product) => product.categorySlug === 'standard');
    await filters.getByRole('button', { name: new RegExp(`^Standard\\s+${standards.length}$`) }).click();
    const standardSeen = new Set();
    const standardDots = page.getByRole('button', { name: /^Show apron page/ });
    for (let index = 0; index < await standardDots.count(); index++) {
      await standardDots.nth(index).click();
      (await page.locator('[data-product-slug]:not([data-workshop-slot])').evaluateAll((items) => items.map((item) => item.dataset.productSlug))).forEach((slug) => standardSeen.add(slug));
    }
    assert.deepEqual([...standardSeen].sort(), standards.map((product) => product.slug).sort());
    const halves = catalog.filter((product) => product.categorySlug === 'half-apron');
    await filters.getByRole('button', { name: new RegExp(`^Half-Aprons\\s+${halves.length}$`) }).click();
    const halfSeen = new Set();
    const halfDots = page.getByRole('button', { name: /^Show apron page/ });
    for (let index = 0; index < await halfDots.count(); index++) {
      await halfDots.nth(index).click();
      (await page.locator('[data-product-slug]:not([data-workshop-slot])').evaluateAll((items) => items.map((item) => item.dataset.productSlug))).forEach((slug) => halfSeen.add(slug));
    }
    assert.deepEqual([...halfSeen].sort(), halves.map((product) => product.slug).sort());
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.goto(`${base}/products`, { waitUntil: 'load' });
    const catalogFilter = page.getByRole('button', { name: /^Crossback\s+5$/ });
    assert.equal(await catalogFilter.locator('span[data-site-scope]').getAttribute('data-site-scope'), 'apron-category-crossback');
    await catalogFilter.click();
    await page.waitForFunction(() => document.querySelectorAll('[data-product-slug]').length === 5);
    const actual = await page.locator('[data-product-slug]').evaluateAll((items) => items.map((item) => item.dataset.productSlug).sort());
    assert.deepEqual(actual, expected);
    assert.equal(await catalogFilter.getAttribute('aria-pressed'), 'true');
    await catalogFilter.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `tmp/category-navigation-review/aprons-${viewport.width}.png` });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: Crossback category on Home and Aprons, all five products reachable, existing categories retained, desktop and mobile.');
} finally {
  await browser.close();
}

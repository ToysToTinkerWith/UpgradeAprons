import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'http://localhost:3004';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
fs.mkdirSync('tmp/seo', { recursive: true });
try {
  for (const reducedMotion of ['reduce', 'no-preference']) {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ reducedMotion, viewport: { width, height: 1000 } });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      for (const route of ['/products', '/products/half-apron', '/products/standard/chocolate-ivory-standard']) {
        await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => {
          let element = document.querySelector('main h1');
          if (!element) return false;
          while (element) {
            if (Number(getComputedStyle(element).opacity) < 1) return false;
            element = element.parentElement;
          }
          return true;
        });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        if (route === '/products') {
          await page.waitForFunction(() => [...document.querySelectorAll('main button[aria-pressed]')].every((element) => Number(getComputedStyle(element).opacity) === 1));
          await page.evaluate(() => document.fonts.ready);
          await page.screenshot({ path: `tmp/seo/catalog-${reducedMotion}-${width}.png` });
        }
      }
      assert.deepEqual(errors, []);
      console.log(`PASS: ${width}px ${reducedMotion}: collection, category and product headings render visibly.`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}

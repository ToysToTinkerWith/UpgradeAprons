import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'http://localhost:3003';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, hasTouch: width === 390, reducedMotion: 'reduce' });
    for (const category of ['crossback', 'standard', 'half-apron']) {
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-workshop-ready="true"]').waitFor();
      await page.locator('[data-workshop-copy-visible="true"]').waitFor();
      const link = page.locator(`[data-workshop-slot="${category}"]`);
      const slug = await link.getAttribute('data-product-slug');
      const href = `/products/${category}/${slug}`;
      assert.equal(await link.getAttribute('href'), href);
      const point = await link.evaluate((anchor) => {
        const image = anchor.querySelector('img');
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = Math.round(160 * image.naturalHeight / image.naturalWidth);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const bounds = anchor.getBoundingClientRect();
        const matrix = new DOMMatrix(getComputedStyle(anchor).transform);
        const scale = Math.min(anchor.clientWidth / image.naturalWidth, anchor.clientHeight / image.naturalHeight);
        const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
        for (let y = Math.floor(canvas.height * .3); y < canvas.height; y += 3) {
          for (let x = 0; x < canvas.width; x += 3) {
            if (pixels[(y * canvas.width + x) * 4 + 3] < 220) continue;
            const local = new DOMPoint((x / canvas.width - .5) * w, (y / canvas.height - .5) * h).matrixTransform(matrix);
            const px = bounds.x + bounds.width / 2 + local.x;
            const py = bounds.y + bounds.height / 2 + local.y;
            if (px < 8 || px > innerWidth - 8 || py < 110 || py > innerHeight - 8) continue;
            if (document.elementFromPoint(px, py)?.closest('[data-workshop-slot]') === anchor) return { x: px, y: py };
          }
        }
        return null;
      });
      assert(point, `Visible ${category} pixels remain clickable at ${width}px`);
      if (width === 390) await page.touchscreen.tap(point.x, point.y);
      else if (category === 'half-apron') {
        await link.focus();
        await page.keyboard.press('Enter');
      } else await page.mouse.click(point.x, point.y);
      await page.waitForURL((url) => url.pathname.replace(/\/$/, '') === href);
      assert(await page.locator('main h1').innerText(), 'Selected product page renders');
    }
    await page.close();
  }
  console.log('PASS: all three actual apron links navigate to their own product pages using touch, mouse, and keyboard.');
} finally {
  await browser.close();
}

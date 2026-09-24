import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'http://localhost:3003';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-workshop-ready="true"]').waitFor();
  for (const width of [768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    const spacing = await page.evaluate(() => {
      const scene = document.querySelector('.workshop-scene').getBoundingClientRect();
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(scene.width);
      canvas.height = Math.ceil(scene.height);
      const ctx = canvas.getContext('2d');
      // Measure actual leather and straps, not transparent image padding.
      for (const slot of document.querySelectorAll('[data-workshop-slot]')) {
        const bounds = slot.getBoundingClientRect();
        const image = slot.querySelector('img');
        const matrix = new DOMMatrix(getComputedStyle(slot).transform);
        const scale = Math.min(slot.clientWidth / image.naturalWidth, slot.clientHeight / image.naturalHeight);
        const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
        ctx.save();
        ctx.translate(bounds.x + bounds.width / 2 - scene.x, bounds.y + bounds.height / 2 - scene.y);
        ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, 0, 0);
        ctx.drawImage(image, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
      const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let top = canvas.height, bottom = 0;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          if (rgba[(y * canvas.width + x) * 4 + 3] > 128) {
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
            break;
          }
        }
      }
      const header = document.querySelector('[data-site-scope="site-header"]').getBoundingClientRect();
      return { height: scene.height, top: top - (header.bottom - scene.y), bottom: scene.height - bottom };
    });
    assert.equal(spacing.height, 884, 'Wider splash trims the old empty tabletop tail');
    assert(spacing.top > 40 && spacing.bottom > 40, 'Aprons retain breathing room on the visible tabletop');
    assert(Math.abs(spacing.top - spacing.bottom) < 35, `Visible margins should balance despite randomized product silhouettes: ${JSON.stringify(spacing)}`);
    console.log(`${width}px: ${spacing.top}px above / ${spacing.bottom}px below the visible aprons.`);
  }
  console.log('PASS: balanced visible apron margins and consistent shorter tabletop across wider screens.');
} finally {
  await browser.close();
}

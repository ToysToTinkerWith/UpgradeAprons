import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const catalog = JSON.parse(fs.readFileSync('src/data/product-catalog.json', 'utf8'));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 1000 } });
  await page.goto(process.argv[3] || 'https://upgradeaprons.web.app/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('[data-workshop-slot]').nth(2).waitFor({ state: 'attached' });
  let originalGeometry;
  for (const width of [320, 360, 390, 430, 639, 640, 767]) {
    await page.setViewportSize({ width, height: 1000 });
    const geometry = await page.locator('[data-workshop-slot]').evaluateAll((slots) => slots.map((slot) => ({
      category: slot.dataset.workshopSlot, x: slot.dataset.workshopSlot === 'half-apron' ? 0 : slot.offsetLeft, y: slot.offsetTop,
      width: slot.clientWidth, height: slot.clientHeight, transform: getComputedStyle(slot).transform,
    })));
    if (originalGeometry) assert.deepEqual(geometry, originalGeometry, 'Relative apron positions cannot drift when resizing');
    else originalGeometry = geometry;
    const half = await page.locator('[data-workshop-slot="half-apron"]').boundingBox();
    assert(Math.abs(half.x + half.width / 2 - width / 2) < 1, 'Half apron remains centered while resizing');
  }
  const result = await page.evaluate(async (products) => {
    // Compare opaque product pixels, not their transparent rectangular frames.
    const masks = await Promise.all(products.map(async (product) => {
      const slot = document.querySelector(`[data-workshop-slot="${product.categorySlug}"]`);
      const image = new Image();
      image.src = product.image;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      const style = getComputedStyle(slot);
      const [ox, oy] = style.transformOrigin.split(' ').map(parseFloat);
      const matrix = new DOMMatrix(style.transform);
      ctx.translate(slot.offsetLeft + ox, slot.offsetTop + oy);
      ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
      ctx.translate(-ox, -oy);
      const scale = Math.min(slot.clientWidth / image.naturalWidth, slot.clientHeight / image.naturalHeight);
      const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
      ctx.drawImage(image, (slot.clientWidth - w) / 2, (slot.clientHeight - h) / 2, w, h);
      const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const alpha = new Uint8Array(canvas.width * canvas.height);
      for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3] > 128 ? 1 : 0;
      return { slug: product.slug, category: product.categorySlug, alpha };
    }));
    const overlaps = [];
    for (const cross of masks.filter((item) => item.category === 'crossback')) {
      for (const other of masks.filter((item) => item.category !== 'crossback')) {
        let pixels = 0;
        for (let i = 0; i < cross.alpha.length; i++) pixels += cross.alpha[i] & other.alpha[i];
        overlaps.push({ cross: cross.slug, other: other.slug, pixels });
      }
    }
    return overlaps;
  }, catalog);
  for (const pair of result) assert(pair.pixels > 100, `Visible apron pixels must overlap: ${JSON.stringify(pair)}`);
  console.log(`PASS: all ${result.length} crossback/standard and crossback/half pairings overlap actual opaque pixels; minimum ${Math.min(...result.map((pair) => pair.pixels))} pixels. Full-apron geometry stays fixed and the half apron stays centered from 320px through 767px.`);
} finally { await browser.close(); }

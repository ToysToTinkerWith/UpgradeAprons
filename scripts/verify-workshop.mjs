import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { pathToFileURL } from 'node:url';

const exports = {};
const code = ts.transpileModule(fs.readFileSync('src/lib/workshop-selection.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
vm.runInNewContext(code, { exports });
const catalog = JSON.parse(fs.readFileSync('src/data/product-catalog.json', 'utf8'));
const { selectWorkshopProducts, workshopCategories } = exports;
assert.equal(selectWorkshopProducts([]).length, 0);
const first = selectWorkshopProducts(catalog, {}, () => 0);
assert.equal(first.length, 3);
const previous = Object.fromEntries(first.map((p) => [p.categorySlug, p.slug]));
const second = selectWorkshopProducts(catalog, previous, () => 0);
assert(second.every((p) => p.slug !== previous[p.categorySlug]));
assert.equal(selectWorkshopProducts([first[0]], previous)[0].slug, first[0].slug);
for (const category of workshopCategories) {
  const seen = new Set(Array.from({ length: 100 }, (_, i) => selectWorkshopProducts(catalog, {}, () => i / 100).find((p) => p.categorySlug === category).slug));
  assert.equal(seen.size, catalog.filter((p) => p.categorySlug === category).length);
}
console.log('PASS: one of each category, all products selectable, no immediate repeats, empty/single-product handling.');
if (!process.argv[2]) process.exit(0);

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'http://localhost:3000';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
fs.mkdirSync('tmp/workshop-review', { recursive: true });
try {
  for (const width of [1440, 1920, 1280, 1024, 768, 767, 640, 639, 430, 390, 360, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    if (width === 390 || width === 360) {
      const standards = catalog.filter((product) => product.categorySlug === 'standard');
      await page.addInitScript((previousStandard) => {
        if (!sessionStorage.getItem('upgrade-aprons-workshop-selection')) {
          sessionStorage.setItem('upgrade-aprons-workshop-selection', JSON.stringify({ standard: previousStandard }));
        }
      }, standards[width === 390 ? 0 : 1].slug);
    }
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (process.env.WORKSHOP_CSS_PREVIEW) {
      const css = fs.readFileSync('src/app/globals.css', 'utf8');
      await page.addStyleTag({ content: css.slice(css.indexOf('@media (max-width: 767px)'), css.indexOf('.splash-hero-fade')) });
    }
    const slots = page.locator('[data-workshop-slot]');
    await slots.nth(2).waitFor({ state: 'attached' });
    const read = () => slots.evaluateAll((items) => Object.fromEntries(items.map((item) => [item.dataset.workshopSlot, item.dataset.productSlug])));
    const initial = await read();
    assert.equal(await page.locator('[data-workshop-slot]:visible').count(), 3);
    assert(await page.locator('[data-workshop-slot="standard"]').isVisible());
    assert.deepEqual(Object.keys(initial).sort(), [...workshopCategories].sort());
    for (let i = 0; i < 3; i++) {
      const img = slots.nth(i).locator('img');
      await img.evaluate(async (image) => image.decode());
      const src = await img.getAttribute('src');
      const slug = await slots.nth(i).getAttribute('data-product-slug');
      assert.equal(new URL(src, base).href, new URL(catalog.find((p) => p.slug === slug).image, base).href);
      assert(await img.evaluate((image) => image.naturalWidth > 500));
      assert(await img.evaluate((image) => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        return ctx.getImageData(0, 0, 1, 1).data[3] === 0;
      }), 'Original cutout retains transparent background');
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('[data-workshop-ready="true"]').waitFor();
    await page.locator('.workshop-apron-image').evaluateAll((images) => Promise.all(images.flatMap((image) => image.getAnimations().map((animation) => animation.finished))));
    await page.locator('[data-workshop-copy-visible="true"]').waitFor();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.workshop-hero-copy')).opacity === '1');
    await page.screenshot({ path: `tmp/workshop-review/initial-${width}.png` });
    const scene = page.locator('[data-workshop-scene]');
    const copy = page.locator('.workshop-hero-copy');
    const sceneBox = await scene.boundingBox();
    const copyBox = await copy.boundingBox();
    assert(sceneBox.y <= copyBox.y && sceneBox.y + sceneBox.height >= copyBox.y + copyBox.height, 'Table is behind the entire splash copy, not below it');
    assert.equal(await scene.evaluate((element) => getComputedStyle(element).position), 'absolute');
    const backgroundStyle = await page.locator('.workshop-table-background').evaluate((element) => {
      const style = getComputedStyle(element);
      return { fit: style.objectFit, position: style.objectPosition, transform: style.transform };
    });
    assert.equal(backgroundStyle.fit, 'cover', 'Table uses proportional scaling without stretching');
    if (width >= 768) assert.equal(backgroundStyle.position, '0% 50%', 'Desktop tabletop framing stays left-anchored');
    else assert.equal(backgroundStyle.transform, 'none', 'The continuous overhead tabletop needs no extra zoom on phones');
    assert.equal(await page.locator('.workshop-table-background').getAttribute('src'), '/images/workshop-table-scaled-tools-v6.png', 'Workbench background remains separate from the actual product images');
    await page.locator('.workshop-table-background').evaluate((image) => image.decode());
    const coverTop = await page.locator('.workshop-table-background').evaluate((image) => {
      const bounds = image.getBoundingClientRect();
      const scale = Math.max(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
      const renderedHeight = image.naturalHeight * scale;
      // The inspected asset's rim and tools occupy less than its top 8%.
      return bounds.y + (bounds.height - renderedHeight) / 2 + renderedHeight * .08;
    });
    for (const slot of await slots.all()) {
      assert((await slot.boundingBox()).y >= coverTop, 'Aprons stay on the leather cover, below tools and the wooden rim');
    }
    assert(await copy.evaluate((element) => getComputedStyle(element, '::before').backgroundImage.includes('gradient')), 'Copy has a local contrast backdrop');
    await scene.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const sceneBounds = await scene.boundingBox();
    const buttons = await page.locator('.workshop-hero-actions a').all();
    const buttonBoxes = await Promise.all(buttons.map((button) => button.boundingBox()));
    if (width >= 640) {
      assert(buttonBoxes.every((box) => Math.abs(box.width - 240) < 1), 'Buttons remain compact at all non-phone widths');
      assert(Math.abs(buttonBoxes[0].y - buttonBoxes[1].y) < 1, 'Buttons stay side by side above phone sizes');
    } else {
      assert(buttonBoxes.every((box) => Math.abs(box.width - Math.min(width / 2, 220)) < 1), 'Phone buttons occupy at most half the viewport width');
      assert(buttonBoxes.every((box) => Math.abs(box.x - copyBox.x) < 1), 'Phone buttons align with the left edge of the copy');
      assert(buttonBoxes[1].y >= buttonBoxes[0].y + buttonBoxes[0].height + 11, 'Phone buttons remain stacked');
      for (const button of buttons) assert(await button.evaluate((element) => element.scrollWidth <= element.clientWidth), 'Button labels fit');
    }
    const standard = await page.locator('[data-workshop-slot="standard"]').boundingBox();
    const crossback = await page.locator('[data-workshop-slot="crossback"]').boundingBox();
    const half = await page.locator('[data-workshop-slot="half-apron"]').boundingBox();
    if (width < 768) {
      const positions = await slots.evaluateAll((items) => Object.fromEntries(items.map((item) => {
        const style = getComputedStyle(item);
        return [item.dataset.workshopSlot, { left: parseFloat(style.left), right: parseFloat(style.right), width: parseFloat(style.width) }];
      })));
      assert.equal(positions.crossback.left, 70 - positions.standard.width / 2, 'Crossback shifts left by half the standard width');
      assert(Math.abs(half.x + half.width / 2 - width / 2) < 1, 'Half apron stays centered on small screens');
      const description = await copy.locator(':scope > p').last().boundingBox();
      assert(Math.abs(buttonBoxes[0].y - description.y - description.height - 20) < 2, 'Mobile buttons follow the description directly');
      assert.equal(await page.locator('.workshop-aprons').evaluate((element) => parseFloat(getComputedStyle(element).width)), 600, 'Mobile aprons share one fixed-width right-anchored group');
      assert(crossback.x < half.x + half.width && crossback.x + crossback.width > half.x && crossback.y < half.y + half.height && crossback.y + crossback.height > half.y, 'Crossback stays connected to the half apron');
      const visibleFraction = (sceneBounds.x + sceneBounds.width - standard.x) / standard.width;
      assert(visibleFraction > .6 && visibleFraction < 1.05, 'Standard is increasingly centered toward the mobile breakpoint');
      const groupRight = await page.locator('.workshop-aprons').evaluate((element) => parseFloat(getComputedStyle(element).right));
      assert.equal(groupRight, Math.min(-40, Math.max(-230, width / 2 - 425)), 'Mobile group moves toward the center as the viewport grows');
      if (width >= 640) assert.equal(await page.locator('.workshop-hero-main').evaluate((element) => parseFloat(getComputedStyle(element).minHeight)), 560, 'Upper mobile splash is 80px shorter');
      assert(standard.height > (sceneBounds.height - 97) * .7, 'Standard fills most of the visible splash height');
      assert(standard.y >= sceneBounds.y + 110 && standard.y + standard.height <= sceneBounds.y + sceneBounds.height - 16, 'Standard retains top and bottom margins');
    } else {
      assert(Math.abs(crossback.y - standard.y) < 2, 'Crossback and standard tops align after rotation');
      const midpoint = (standard.x + standard.width / 2 + crossback.x + crossback.width / 2) / 2;
      assert(Math.abs(half.x + half.width / 2 - midpoint) < 1, 'Half apron sits midway between the full aprons');
      assert.equal(await page.locator('[data-workshop-slot="half-apron"]').evaluate((element) => parseFloat(getComputedStyle(element).top)), 400, 'Half apron is raised on larger screens');
    }
    assert(crossback.x + crossback.width / 2 < half.x + half.width / 2, 'Crossback sits to the left of the half apron');
    assert(half.y > standard.y && half.y + half.height > standard.y + standard.height, 'Half apron sits below Standard');
    const overlap = standard.y + standard.height - half.y;
    assert(overlap > 0 && overlap < standard.height * .5, 'Half apron overlaps the lower part of Standard');
    const layers = await slots.evaluateAll((items) => Object.fromEntries(items.map((item) => [item.dataset.workshopSlot, Number(getComputedStyle(item).zIndex)])));
    assert.deepEqual([layers.crossback, layers.standard, layers['half-apron']], [1, 2, 3], 'Half apron lies on top of the lower edge of Standard');
    await page.screenshot({ path: `tmp/workshop-review/page-${width}.png` });
    await scene.screenshot({ path: `tmp/workshop-review/scene-${width}.png` });
    for (const slot of await slots.all()) {
      const dimensions = await slot.evaluate((element) => {
        const style = getComputedStyle(element);
        return [parseFloat(style.width), parseFloat(style.height)];
      });
      const category = await slot.getAttribute('data-workshop-slot');
      const expected = width < 768
        ? category === 'half-apron' ? [500, 268] : [440, 600]
        : category === 'half-apron' ? [600, 320] : [520, 700];
      assert.deepEqual(dimensions, expected, 'Apron dimensions remain fixed within each layout');
      const box = await slot.boundingBox();
      if (width < 768) {
        assert(await slot.evaluate((element) => {
          const matrix = new DOMMatrix(getComputedStyle(element).transform);
          return Math.abs(Math.hypot(matrix.a, matrix.b) - Math.hypot(matrix.c, matrix.d)) < .0001
            && Math.abs(matrix.a * matrix.c + matrix.b * matrix.d) < .0001;
        }), 'Mobile aprons use uniform scaling and rotation without stretching or skew');
      } else {
        assert(box.x >= sceneBounds.x - 2 && box.x + box.width <= sceneBounds.x + sceneBounds.width + 2, `Uncropped aprons stay inside scene horizontally at ${width}px`);
      }
      assert(box.y >= sceneBounds.y - 2 && box.y + box.height <= sceneBounds.y + sceneBounds.height + 2, `Apron stays inside scene vertically at ${width}px`);
    }
    await page.screenshot({ path: `tmp/workshop-review/page-${width}.png` });
    await scene.screenshot({ path: `tmp/workshop-review/scene-${width}.png` });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await slots.nth(2).waitFor({ state: 'attached' });
    const refreshed = await read();
    for (const category of workshopCategories) assert.notEqual(refreshed[category], initial[category]);
    await page.setViewportSize({ width: width + 1, height: 880 });
    await page.waitForTimeout(300);
    assert.deepEqual(await read(), refreshed, 'Resize must not reselect products');
    await page.setViewportSize({ width: width < 768 ? 1024 : 390, height: 844 });
    assert.equal(await page.locator('[data-workshop-slot]:visible').count(), 3);
    assert.deepEqual(await read(), refreshed, 'Crossing the mobile breakpoint preserves selection');
    assert.deepEqual(errors, []);
    await page.close();
  }
  // Privacy settings or broken stored state must not prevent the display.
  for (const blocked of [false, true]) {
    const page = await browser.newPage();
    await page.addInitScript((deny) => {
      if (deny) Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('Storage unavailable'); } });
      else sessionStorage.setItem('upgrade-aprons-workshop-selection', '{invalid');
    }, blocked);
    await page.goto(base, { waitUntil: 'load' });
    await page.locator('[data-workshop-slot]').nth(2).waitFor();
    await page.close();
  }
  console.log('PASS: mobile half apron centered, desktop full-apron tops aligned and half apron centered between them, fixed sizes, randomized reloads, storage fallbacks, no runtime errors.');
} finally {
  await browser.close();
}

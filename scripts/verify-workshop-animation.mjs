import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'http://localhost:3003';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const width of [390, 767, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-workshop-ready="true"]').waitFor();
    const sample = async (time) => page.locator('.workshop-apron-image').evaluateAll((images, time) => Object.fromEntries(images.map((image) => {
      const [animation] = image.getAnimations();
      animation.pause();
      animation.currentTime = time;
      const style = getComputedStyle(image);
      const matrix = new DOMMatrix(style.transform);
      return [image.closest('[data-workshop-slot]').dataset.workshopSlot, {
        opacity: Number(style.opacity), scale: Math.hypot(matrix.a, matrix.b),
        delay: animation.effect.getTiming().delay,
      }];
    })), time);
    const first = await sample(140);
    assert.equal(await page.locator('.workshop-hero-copy').getAttribute('data-workshop-copy-visible'), 'false', 'Copy stays hidden while aprons are landing');
    assert(await page.locator('.workshop-hero-copy').evaluate((element) => element.inert), 'Hidden buttons cannot receive focus');
    assert(first.crossback.opacity > 0 && first.crossback.scale > 1.1);
    assert.equal(first.standard.opacity, 0);
    assert.equal(first['half-apron'].opacity, 0);
    if (width === 767) await page.screenshot({ path: 'tmp/workshop-review/drop-crossback.png' });
    const second = await sample(790);
    assert(second.standard.opacity > 0 && second.standard.scale > 1.1);
    assert.equal(second['half-apron'].opacity, 0);
    const third = await sample(1440);
    assert(third['half-apron'].opacity > 0 && third['half-apron'].scale > 1.1);
    assert.equal(await page.locator('.workshop-hero-copy').getAttribute('data-workshop-copy-visible'), 'false', 'Copy waits for the final half apron to finish landing');
    const settled = await sample(2200);
    for (const state of Object.values(settled)) {
      assert.equal(state.opacity, 1);
      assert.equal(state.scale, 1);
    }
    await page.locator('.workshop-apron-image').evaluateAll((images) => images.forEach((image) => image.getAnimations().forEach((animation) => animation.finish())));
    await page.locator('[data-workshop-copy-visible="true"]').waitFor();
    assert(await page.locator('.workshop-hero-copy').evaluate((element) => [...element.children].every((child) => getComputedStyle(child).opacity === '1' && getComputedStyle(child).transform === 'none' && child.getAnimations().length === 0)), 'Text and buttons share their parent reveal instead of staggered child animations');
    await page.waitForTimeout(1800);
    assert.equal(await page.locator('.workshop-hero-copy').evaluate((element) => getComputedStyle(element).opacity), '1');
    assert(await page.locator('.workshop-hero-copy > p').last().evaluate((element) => Number(getComputedStyle(element).opacity) === 1));
    assert.equal(await page.locator('.workshop-hero-copy .splash-hero-kicker').evaluate((element) => getComputedStyle(element, '::before').content), 'none', 'Kicker has no extra dark backdrop');
    assert.equal(await page.locator('.workshop-table-background').evaluate((element) => getComputedStyle(element).filter), 'brightness(0.8) saturate(0.92)', 'Only the tabletop is gently darkened');
    await page.screenshot({ path: `tmp/workshop-review/landed-${width}.png` });
    assert.deepEqual(errors, []);
    await page.close();
  }
  const reduced = await browser.newPage({ reducedMotion: 'reduce' });
  await reduced.goto(base, { waitUntil: 'domcontentloaded' });
  await reduced.locator('[data-workshop-ready="true"]').waitFor();
  assert(await reduced.locator('.workshop-apron-image').evaluateAll((images) => images.every((image) => {
    const style = getComputedStyle(image);
    return style.opacity === '1' && style.animationName === 'none' && style.transform === 'none';
  })), 'Reduced motion shows aprons immediately without a drop animation');
  assert.equal(await reduced.locator('.workshop-hero-copy').getAttribute('data-workshop-copy-visible'), 'true', 'Reduced motion does not delay the copy');
  await reduced.waitForFunction(() => getComputedStyle(document.querySelector('.workshop-hero-copy')).opacity === '1');
  assert.equal(await reduced.locator('.workshop-hero-copy').evaluate((element) => element.inert), false);
  await reduced.close();
  const slow = await browser.newPage();
  let releaseImages;
  const imageGate = new Promise((resolve) => { releaseImages = resolve; });
  await slow.route('**/images/products/**', async (route) => {
    await imageGate;
    await route.continue();
  });
  try {
    await slow.goto(base, { waitUntil: 'domcontentloaded' });
    await slow.locator('.workshop-apron-image').nth(2).waitFor({ state: 'attached' });
    assert.equal(await slow.locator('.workshop-aprons').getAttribute('data-workshop-ready'), 'false');
    assert.equal(await slow.locator('.workshop-hero-copy').getAttribute('data-workshop-copy-visible'), 'false', 'Slow photos cannot cause the text to appear ahead of the aprons');
    assert(await slow.locator('.workshop-apron-image').evaluateAll((images) => images.every((image) => image.getAnimations().length === 0)), 'Sequence waits for photos instead of animating unloaded images');
  } finally {
    releaseImages();
  }
  await slow.locator('[data-workshop-ready="true"]').waitFor();
  await slow.close();
  console.log('PASS: crossback, standard, half drop in order from larger to settled size; phone/tablet/desktop screenshots; reduced motion; no runtime errors.');
} finally {
  await browser.close();
}

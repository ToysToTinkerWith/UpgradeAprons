import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || 'http://localhost:3003';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
await mkdir('tmp/workshop-review', { recursive: true });

const waitForCopy = (page) => page.waitForFunction(() => {
  const copy = document.querySelector('.workshop-hero-copy');
  return [copy, ...copy.children].every((child) => {
  const style = getComputedStyle(child);
  return style.opacity === '1' && (style.transform === 'none' || new DOMMatrix(style.transform).isIdentity);
  });
}, undefined, { timeout: 5000 });

async function assertApronSequence(page, mode = 'sequence') {
  const states = await page.locator('.workshop-apron-image').evaluateAll((images) => images.map((image) => {
    const style = getComputedStyle(image);
    return {
      opacity: style.opacity, transform: style.transform,
      animation: style.animationName, animations: image.getAnimations().length,
      loading: image.loading, priority: image.fetchPriority,
    };
  }));
  assert.equal(states.length, 3);
  for (const state of states) {
    assert.equal(state.transform, 'none', 'Apron images never move or change size');
    assert.equal(state.loading, 'eager');
    assert.equal(state.priority, 'high');
    if (mode !== 'sequence') {
      assert.equal(state.opacity, mode === 'reduced' ? '1' : '0');
      assert.equal(state.animation, 'none');
    } else {
      assert.equal(state.animation, 'workshop-apron-fade');
    }
  }
  if (mode !== 'sequence') return;
  const sample = (time) => page.locator('.workshop-apron-image').evaluateAll((images, time) => Object.fromEntries(images.map((image) => {
    const animation = image.getAnimations()[0];
    animation.pause();
    animation.currentTime = time;
    const timing = animation.effect.getTiming();
    return [image.closest('[data-workshop-slot]').dataset.workshopSlot, { opacity: Number(getComputedStyle(image).opacity), delay: timing.delay, duration: timing.duration }];
  })), time);
  const first = await sample(250);
  assert(first.crossback.opacity > 0 && first.crossback.opacity < 1);
  assert.equal(first.standard.opacity, 0);
  assert.equal(first['half-apron'].opacity, 0);
  assert.deepEqual(['crossback', 'standard', 'half-apron'].map((key) => first[key].delay), [0, 500, 1000]);
  assert(Object.values(first).every((state) => state.duration === 500));
  const second = await sample(750);
  assert.equal(second.crossback.opacity, 1);
  assert(second.standard.opacity > 0 && second.standard.opacity < 1);
  assert.equal(second['half-apron'].opacity, 0);
  const third = await sample(1250);
  assert.equal(third.standard.opacity, 1);
  assert(third['half-apron'].opacity > 0 && third['half-apron'].opacity < 1);
  assert.equal(await page.locator('.workshop-hero-copy').getAttribute('data-workshop-copy-visible'), 'false', 'Words wait until the half apron finishes fading');
  assert.equal(await page.locator('.workshop-hero-copy').evaluate((element) => element.inert), true, 'Hidden buttons cannot receive focus');
  await page.locator('.workshop-apron-image').evaluateAll((images) => images.forEach((image) => image.getAnimations().forEach((animation) => animation.finish())));
  await page.locator('[data-workshop-copy-visible="true"]').waitFor();
}

try {
  for (const width of [390, 767, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.addInitScript(() => {
      window.splashAnimations = [];
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (frames, options) {
        if (this.classList.contains('workshop-hero-copy') || this.parentElement?.classList.contains('workshop-hero-copy')) {
          const matrix = new DOMMatrix(getComputedStyle(this).transform);
          window.splashAnimations.push({ parent: this.classList.contains('workshop-hero-copy'), x: matrix.e, y: matrix.f, delay: options.delay, duration: options.duration });
        }
        return animate.call(this, frames, options);
      };
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-workshop-ready="true"]').waitFor();
    await assertApronSequence(page);
    assert(await page.locator('.workshop-apron-image').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)), 'All three product images load successfully');
    assert.equal(await page.locator('.workshop-hero-copy').getAttribute('data-workshop-copy-visible'), 'true');
    assert.equal(await page.locator('.workshop-hero-copy').evaluate((element) => element.inert), false);
    await waitForCopy(page);
    const animations = await page.evaluate(() => window.splashAnimations);
    assert(animations.length > 0 && animations.every((entry) => entry.parent), 'Only the shared copy container animates; no staggered child reveals');
    assert(animations.every((entry) => entry.delay === 0 && entry.duration === 1050), 'All wording and buttons share one fade timing');
    assert.equal(await page.locator('.workshop-loading-cover').count(), 0);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `tmp/workshop-review/static-${width}.png` });
    assert.deepEqual(errors, []);
    await page.close();
  }

  const reduced = await browser.newPage({ reducedMotion: 'reduce' });
  await reduced.goto(base, { waitUntil: 'domcontentloaded' });
  await reduced.locator('[data-workshop-ready="true"]').waitFor();
  await assertApronSequence(reduced, 'reduced');
  await waitForCopy(reduced);
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
    await assertApronSequence(slow, 'pending');
    assert.equal(await slow.locator('.workshop-loading-cover').count(), 0, 'No loader is shown, even on a slow connection');
    assert.equal(await slow.locator('.workshop-hero-copy').getAttribute('data-workshop-copy-visible'), 'false');
    assert.equal(await slow.locator('main').evaluate((element) => element.inert), false, 'Page is usable while images load');
    assert.equal(await slow.locator('main').evaluate((element) => getComputedStyle(element).visibility), 'visible');
  } finally {
    releaseImages();
  }
  await slow.locator('[data-workshop-ready="true"]').waitFor();
  await slow.locator('.workshop-loading-cover').waitFor({ state: 'detached' });
  await assertApronSequence(slow);
  await waitForCopy(slow);
  await slow.close();
  console.log('PASS: crossback, standard, half fade in sequentially without movement; wording follows; no loading screen; responsive, reduced-motion, and slow-image checks.');
} finally {
  await browser.close();
}

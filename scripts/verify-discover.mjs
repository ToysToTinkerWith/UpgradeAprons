import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || "http://localhost:3003";
const allowMissingPhotos = process.argv.includes("--pending-photos");
await mkdir("tmp/discover", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const pendingPhotos = new Set();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${base}/leather-hardware`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1, name: "Leather & Hardware" }).waitFor();
  const desktop = page.getByRole("navigation", { name: "Primary navigation", exact: true });
  const discover = desktop.getByRole("button", { name: "Discover", exact: true });
  await page.waitForFunction(() => {
    const button = document.querySelector('nav[aria-label="Primary navigation"] button');
    return button && Object.keys(button).some(key => key.startsWith("__reactProps$"));
  });
  await discover.click();
  assert.equal(await page.locator("header").first().evaluate(el => getComputedStyle(el).opacity), "1", "Navigation must stay visible with reduced motion");
  assert.equal(await discover.getAttribute("aria-expanded"), "true");
  assert.equal(await desktop.getByRole("link", { name: "Leather & Hardware" }).getAttribute("aria-current"), "page");
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(":focus").innerText(), "Markets & Events");
  await page.keyboard.press("Escape");
  assert.equal(await discover.getAttribute("aria-expanded"), "false");
  assert.equal(await discover.evaluate(el => el === document.activeElement), true);
  await discover.click();
  await page.getByRole("heading", { level: 1 }).click();
  assert.equal(await discover.getAttribute("aria-expanded"), "false");
  await discover.click();
  await desktop.getByRole("link", { name: "Markets & Events" }).click();
  await page.waitForURL("**/events");
  await page.getByRole("heading", { name: "Upgrade Aprons in the Market." }).waitFor();
  assert.match(await page.title(), /Markets & Events/);

  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/leather-hardware`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    const figures = page.locator("main figure");
    assert.equal(await figures.count(), 5);
    for (let i = 0; i < 5; i++) {
      await figures.nth(i).scrollIntoViewIfNeeded();
      const img = figures.nth(i).locator("img");
      await img.evaluate(el => el.complete ? null : new Promise(resolve => {
        el.addEventListener("load", resolve, { once: true });
        el.addEventListener("error", resolve, { once: true });
      }));
      const loaded = await img.evaluate(el => el.naturalWidth > 0);
      if (!loaded) pendingPhotos.add(await img.getAttribute("src"));
      if (!allowMissingPhotos) assert.ok(loaded, `Missing photo: ${await img.getAttribute("src")}`);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}`);
    const overlaps = await page.locator("main h1, main h2, main h3").evaluateAll(headings => headings.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.textContent));
    assert.deepEqual(overlaps, [], `Heading overflow at ${width}`);
    await page.evaluate(() => scrollTo(0, 0));
    if ([390, 1440].includes(width)) {
      await page.screenshot({ path: `tmp/discover/materials-${width}.png`, fullPage: true });
      await page.screenshot({ path: `tmp/discover/materials-top-${width}.png` });
    }

    if (width < 1280) {
      await page.getByRole("button", { name: "Open navigation menu" }).click();
      const mobile = page.getByRole("navigation", { name: "Mobile navigation", exact: true });
      await mobile.getByRole("button", { name: "Discover", exact: true }).click();
      assert.equal(await mobile.getByRole("link").count(), 7);
      await mobile.getByRole("link", { name: "Customer Photos" }).click();
      await page.waitForURL("**/customer-photos");
      await page.getByRole("heading", { name: "Customer Photos", exact: true }).waitFor();
      assert.equal(await page.getByRole("navigation", { name: "Mobile navigation", exact: true }).count(), 0);
      assert.equal(await page.locator("main img").count(), 4);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Photos overflow at ${width}`);
    }
    console.log(`Layout and navigation passed at ${width}px`);
  }
  await page.goto(`${base}/leather-hardware`, { waitUntil: "domcontentloaded" });
  await page.locator("main figure button").first().click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached" });
  assert.deepEqual(errors, [], "Browser errors");
  console.log("Desktop keyboard, outside dismissal, routing, mobile navigation, customer gallery, and photo viewer passed.");
  if (pendingPhotos.size) console.log(`PHOTO VERIFICATION BLOCKED: ${JSON.stringify([...pendingPhotos])}`);
} finally {
  await browser.close();
}

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || "http://localhost:3003";
await mkdir("tmp/customer-photos", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const width of [320, 390, 640, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/customer-photos`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.title(), "Leather Aprons at Work | Customer Photos | Upgrade Aprons");
    const gallery = page.getByRole("region", { name: "Customer photo gallery" });
    const photos = gallery.locator("img");
    assert.equal(await photos.count(), 7);
    assert.ok((await photos.nth(4).getAttribute("src")).endsWith("/mirror-selfie.webp"));
    assert.ok((await photos.nth(5).getAttribute("src")).endsWith("/coffee-team.webp"));
    assert.ok((await photos.nth(6).getAttribute("src")).endsWith("/outdoor-market.webp"));
    for (const photo of await photos.all()) {
      await photo.scrollIntoViewIfNeeded();
      await photo.evaluate(el => el.decode());
      const size = await photo.evaluate(el => ({
        loaded: el.complete && el.naturalWidth > 0,
        ratio: el.clientWidth / el.clientHeight,
        naturalRatio: el.naturalWidth / el.naturalHeight,
        declaredRatio: Number(el.getAttribute("width")) / Number(el.getAttribute("height")),
      }));
      assert.ok(size.loaded);
      assert.ok(Math.abs(size.ratio - size.naturalRatio) < 0.01, "Photo must not be stretched or cropped");
      assert.ok(Math.abs(size.declaredRatio - size.naturalRatio) < 0.01, "Declared dimensions must match the photo");
    }
    const first = await photos.nth(0).boundingBox();
    const second = await photos.nth(1).boundingBox();
    assert.ok(width < 640 ? second.y > first.y : Math.abs(second.y - first.y) < 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}`);
    assert.equal(await page.getByRole("link", { name: "Customer Stories", exact: true }).count(), 0);
    await page.locator("footer").getByRole("button", { name: "Discover", exact: true }).click();
    assert.equal(await page.locator("footer").getByRole("link", { name: "Customer Photos", exact: true }).getAttribute("href"), "/customer-photos");
    await page.evaluate(() => scrollTo(0, 0));
    if ([390, 1440].includes(width)) {
      await page.screenshot({ path: `tmp/customer-photos/${width}.png`, fullPage: true });
      await page.screenshot({ path: `tmp/customer-photos/top-${width}.png` });
    }
    console.log(`Seven loaded, uncropped photos; correct grid and links at ${width}px`);
  }
  await page.goto(`${base}/customer-stories`, { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/customer-photos");
  assert.deepEqual(errors, []);
  console.log("Old page redirects to Customer Photos. No browser errors.");
} finally {
  await browser.close();
}

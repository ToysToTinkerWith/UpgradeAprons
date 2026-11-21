import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || "http://localhost:3011";
await mkdir("tmp/catalog-search", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const javaScriptEnabled of [false, true]) {
    const context = await browser.newContext({ javaScriptEnabled, reducedMotion: "reduce" });
    const page = await context.newPage();
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const response = await page.goto(`${base}/products`, { waitUntil: "domcontentloaded" });
      assert.equal(response.status(), 200);
      assert.equal(await page.title(), "Upgrade Aprons | Handcrafted Leather Apron Collection");
      assert.equal(await page.locator('meta[property="og:title"]').getAttribute("content"), await page.title());
      assert.equal(await page.locator('meta[name="twitter:title"]').getAttribute("content"), await page.title());
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://upgradeaprons.com/products");
      assert.match(await page.locator('meta[name="robots"]').getAttribute("content"), /index, follow/);
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(await page.locator("h1").innerText(), "Upgrade Aprons.");
      const cards = page.locator("main article[data-product-slug]");
      assert.ok(await cards.count() > 0);
      const visibleOnFirstRender = await page.locator("main h1, main article[data-product-slug]").evaluateAll(elements => elements.every(element => {
        for (let node = element; node; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (Number(style.opacity) !== 1 || style.visibility === "hidden" || style.display === "none") return false;
        }
        return true;
      }));
      assert.ok(visibleOnFirstRender, "Catalog must be visible without JavaScript or animation");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if (javaScriptEnabled) {
        await page.waitForLoadState("load");
        const crossback = page.getByRole("button", { name: /^Crossback\b/i });
        await crossback.click();
        await page.waitForFunction(() => [...document.querySelectorAll("main article[data-product-slug]")].every(card => card.querySelector('a[href="/products/crossback"]')));
        await page.getByRole("button", { name: /^All\b/i }).click();
      }
      await page.screenshot({ path: `tmp/catalog-search/catalog-${javaScriptEnabled}-${width}.png` });
      console.log(`PASS: branded metadata, self-canonical, visible catalog, ${width}px, JS=${javaScriptEnabled}`);
    }
    await page.goto(`${base}/leather-hardware`, { waitUntil: "domcontentloaded" });
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://upgradeaprons.com/leather-hardware");
    assert.match(await page.locator('meta[name="robots"]').getAttribute("content"), /index, follow/);
    assert.equal(await page.getByRole("link", { name: "Browse the Upgrade Aprons collection" }).getAttribute("href"), "/products");
    await context.close();
  }
  console.log("PASS: materials page retains its own canonical and links prominently to the catalog.");
} finally {
  await browser.close();
}

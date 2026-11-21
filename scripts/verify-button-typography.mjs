import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.argv[3] || "http://localhost:3003";
await mkdir("tmp/button-typography", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const typography = el => {
    const style = getComputedStyle(el);
    return Object.fromEntries(["fontFamily", "fontSize", "fontWeight", "letterSpacing", "textTransform"].map(key => [key, style[key]]));
  };
  let reference;
  for (const width of [320, 360, 390, 639, 640, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [route, selector] of [["/", ".workshop-hero-actions a"], ["/leather-hardware", '[data-site-scope="materials-next"] a']]) {
      await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);
      const buttons = page.locator(selector);
      assert.equal(await buttons.count(), 2);
      reference ??= await page.locator('footer a[href="/custom"]').evaluate(typography);
      for (const button of await buttons.all()) {
        assert.deepEqual(await button.evaluate(typography), reference, `Typography differs at ${width}px on ${route}`);
        const fits = await button.evaluate(el => {
          const box = el.getBoundingClientRect();
          const text = [...el.childNodes].filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
          return el.scrollWidth <= el.clientWidth + 1 && text.every(node => {
            const range = document.createRange();
            range.selectNodeContents(node);
            return [...range.getClientRects()].every(rect => rect.left >= box.left && rect.right <= box.right + 1 && rect.top >= box.top && rect.bottom <= box.bottom + 1);
          });
        });
        assert.ok(fits, `Button label overflows at ${width}px on ${route}`);
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Page overflows at ${width}px on ${route}`);
      if ([320, 390, 1440].includes(width)) {
        if (route === "/") {
          await page.waitForFunction(() => getComputedStyle(document.querySelector(".workshop-hero-copy")).opacity === "1");
        } else {
          await page.locator('[data-site-scope="materials-next"]').scrollIntoViewIfNeeded();
        }
        await page.screenshot({ path: `tmp/button-typography/${route === "/" ? "home" : "materials"}-${width}.png` });
      }
    }
    console.log(`Both button groups match site typography and fit at ${width}px`);
  }
} finally {
  await browser.close();
}

import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const origin = process.argv[3] ?? "http://127.0.0.1:5000";
const catalog = JSON.parse(fs.readFileSync("src/data/product-catalog.json", "utf8"));
const standard = catalog.filter(product => product.categorySlug === "standard");
const browser = await chromium.launch({ channel: "msedge", headless: true });
fs.mkdirSync("tmp/custom-development-review", { recursive: true });
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 950 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const visit = async route => {
      const response = await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded" });
      assert.equal(response.status(), 200, route);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1200);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route}: overflow at ${width}`);
    };
    const capture = async name => {
      for (let y = 0; y < await page.evaluate(() => document.body.scrollHeight); y += 700) {
        await page.evaluate(value => scrollTo(0, value), y);
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(1400);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `tmp/custom-development-review/${name}-${width}.png`, fullPage: true });
    };
    await visit("/product-development");
    assert.equal(await page.locator("main h1").innerText(), "Product Development");
    assert.match(await page.locator("main").innerText(), /Not yet available for purchase/);
    assert.equal(await page.getByRole("link", { name: "Share your thoughts" }).evaluate(link => getComputedStyle(link).color), "rgb(5, 4, 3)");
    const photos = page.locator("main figure img");
    assert.equal(await photos.count(), 2);
    for (const photo of await photos.all()) {
      await photo.scrollIntoViewIfNeeded();
      await photo.evaluate(img => img.decode());
      assert(await photo.evaluate(img => img.naturalWidth === 1440 && img.naturalHeight === 1920));
      assert.equal(await photo.evaluate(img => getComputedStyle(img).objectFit), "fill");
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `tmp/custom-development-review/development-${width}.png`, fullPage: true });
    await page.locator("footer").getByRole("button", { name: "Discover", exact: true }).click();
    assert.equal(await page.locator("footer").getByRole("link", { name: "Product Development", exact: true }).getAttribute("href"), "/product-development");

    await visit("/products/custom");
    assert.equal(await page.locator("main article[data-product-slug]").count(), 1);
    assert.match(await page.locator("main article").innerText(), /SOLD/);
    assert(!/\$\d/.test(await page.locator("main article").innerText()));
    await page.screenshot({ path: `tmp/custom-development-review/custom-category-${width}.png`, fullPage: true });

    await visit("/products/custom/graphite-utility-custom");
    assert.match(await page.locator("main").innerText(), /Sold\. Not available to purchase\./);
    assert.match(await page.locator("main").innerText(), /Not yet measured/);
    assert.equal(await page.locator("main form").count(), 0);
    assert.equal(await page.getByText("Edit size & measurements", { exact: true }).count(), 0);
    assert.equal(await page.getByRole("link", { name: "Design your own", exact: true }).getAttribute("href"), "/custom");
    assert.equal(await page.getByRole("link", { name: "Design your own", exact: true }).evaluate(link => getComputedStyle(link).color), "rgb(5, 4, 3)");
    const schema = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => JSON.parse(node.textContent)).find(data => data["@type"] === "Product"));
    assert.equal(schema.offers, undefined);
    await capture("custom-detail");

    await visit("/products/standard");
    assert.equal(await page.locator("main article[data-product-slug]").count(), standard.length);
    const filters = page.getByRole("group", { name: "Standard apron size" });
    for (const size of ["Small", "Large"]) {
      await filters.getByRole("button", { name: new RegExp(`^${size}`) }).click();
      assert.equal(await page.locator("main article[data-product-slug]").count(), standard.filter(product => product.standardSize === size.toLowerCase()).length);
      if (!standard.some(product => product.standardSize === size.toLowerCase())) {
        assert.match(await page.locator("main [role=status]").innerText(), /No aprons have a confirmed/);
      }
    }
    await filters.getByRole("button", { name: /^All sizes/ }).click();
    assert.equal(await page.locator("main article[data-product-slug]").count(), standard.length);
    await page.screenshot({ path: `tmp/custom-development-review/standard-${width}.png` });

    await visit("/products");
    assert.equal(await page.locator("main article[data-product-slug]").count(), catalog.length);
    await page.getByRole("button", { name: /^Custom\s/ }).click();
    assert.equal(await page.locator("main article[data-product-slug]").count(), 1);
    await page.getByRole("button", { name: /^Standard\s/ }).click();
    await page.getByRole("group", { name: "Standard apron size" }).getByRole("button", { name: /^Small/ }).click();
    await page.getByRole("button", { name: /^Custom\s/ }).click();
    await page.getByRole("button", { name: /^Standard\s/ }).click();
    assert.equal(await page.locator("main article[data-product-slug]").count(), standard.length);
    const product = standard[0];
    await visit(`/products/standard/${product.slug}`);
    assert.match(await page.locator("main").innerText(), /Size & fit/);
    assert.equal(await page.locator("main form").count(), 1);
    if (width === 1440) {
      await visit("/");
      await page.getByRole("button", { name: /^Custom\s/ }).click();
      assert.match(await page.locator("main").innerText(), /Graphite Utility Custom Apron/);
    }
    assert.equal(errors.length, 0, errors.join("\n"));
    await page.close();
    console.log(`PASS: ${width}px development photos, Custom/SOLD, diagrams, filters, category switching, forms and no JS errors.`);
  }
} finally {
  await browser.close();
}

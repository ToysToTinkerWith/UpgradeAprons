import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const standards = JSON.parse(fs.readFileSync("src/data/product-catalog.json", "utf8")).filter(product => product.categorySlug === "standard");
const largeCount = standards.filter(product => product.standardSize === "large").length;
const smallCount = standards.filter(product => product.standardSize === "small").length;
const root = path.resolve("out");
const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
let server;
let origin = process.argv[3];
if (!origin) {
  server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const base = path.resolve(root, `.${pathname}`);
    if (!base.startsWith(`${root}${path.sep}`) && base !== root) { res.writeHead(403); res.end(); return; }
    const file = [base, `${base}.html`, path.join(base, "index.html")].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!file) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
}
const browser = await chromium.launch({ channel: "msedge", headless: true });
fs.mkdirSync("tmp/standard-sizing-review", { recursive: true });
try {
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 950 }, reducedMotion: "reduce" });
    if (server) await page.route("**/firestore.googleapis.com/**", route => route.abort());
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    async function visit(route) {
      const response = await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded" });
      assert.equal(response.status(), 200);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(2000);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: overflow`);
    }
    await visit("/products/standard");
    const cards = page.locator("main article[data-product-slug]");
    assert.equal(await cards.count(), standards.length);
    assert.equal(await cards.getByText("Large", { exact: true }).count(), largeCount);
    assert.equal(await cards.getByText("Small", { exact: true }).count(), smallCount);
    assert.equal(await cards.filter({ hasText: "(estimated)" }).count(), 0);
    assert.equal(await cards.filter({ hasText: "Size to be confirmed" }).count(), 0);
    for (const slug of ["pearl-burgundy-gold-standard", "burgundy-bloom-standard", "cobalt-crimson-standard"]) {
      assert.match(await page.locator(`article[data-product-slug="${slug}"]`).innerText(), /Large/);
    }
    const group = page.getByRole("group", { name: "Standard apron size" });
    await group.getByRole("button", { name: /^Large/ }).click();
    assert.equal(await cards.count(), largeCount);
    await group.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `tmp/standard-sizing-review/large-${width}.png` });
    await group.getByRole("button", { name: /^Small/ }).click();
    assert.equal(await cards.count(), smallCount);
    await page.screenshot({ path: `tmp/standard-sizing-review/small-${width}.png` });
    await group.getByRole("button", { name: /^All sizes/ }).click();
    assert.equal(await cards.count(), standards.length);
    await visit("/products/standard/sage-ivory-burgundy-standard");
    const fit = page.getByRole("region", { name: "Apron measurements" });
    assert.match(await fit.innerText(), /Small/);
    assert.match(await fit.innerText(), /20.5 in \/ 52.1 cm/);
    assert.match(await fit.innerText(), /26 in \/ 66 cm/);
    assert.match(await fit.innerText(), /7.5 in \/ 19.1 cm/);
    assert.match(await fit.innerText(), /Design-tool template dimensions/);
    assert.doesNotMatch(await fit.innerText(), /estimated|Not yet measured/);
    assert.equal(await fit.locator("[data-standard-size-diagram]").count(), 1);
    assert.equal(await page.getByText("Edit size & measurements", { exact: true }).count(), 0);
    assert.match(await page.locator("main").innerText(), /\$175/);
    await fit.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `tmp/standard-sizing-review/fit-${width}.png` });
    await visit("/products/standard/chocolate-ivory-standard");
    const largeFit = page.getByRole("region", { name: "Apron measurements" });
    assert.match(await largeFit.innerText(), /22.5 in \/ 57.1 cm/);
    assert.match(await largeFit.innerText(), /28 in \/ 71.1 cm/);
    assert.match(await largeFit.innerText(), /9 in \/ 22.9 cm/);
    assert.doesNotMatch(await largeFit.innerText(), /estimated|Not yet measured/);
    await largeFit.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `tmp/standard-sizing-review/fit-large-${width}.png` });
    await visit("/products");
    await page.getByRole("button", { name: /^Standard\s/ }).click();
    await page.getByRole("group", { name: "Standard apron size" }).getByRole("button", { name: /^Large/ }).click();
    assert.equal(await page.locator("main article[data-product-slug]").count(), largeCount);
    assert.equal(errors.length, 0, errors.join("\n"));
    await page.close();
    console.log(`PASS ${width}px: clean size labels, Small/Large template dimensions and diagrams, filters, unchanged price, no overflow/JS errors.`);
  }
} finally {
  await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}

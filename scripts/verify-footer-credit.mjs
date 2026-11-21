import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createServer } from "node:http";
import { existsSync, statSync, createReadStream } from "node:fs";
import path from "node:path";

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
let base = process.argv[3] || "http://localhost:3011";
let server;
if (base === "--static") {
  const root = path.resolve("out");
  const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
  server = createServer((req, res) => {
    const target = path.resolve(root, "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname));
    if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    const file = [target, target + ".html", path.join(target, "index.html")].find(p => existsSync(p) && statSync(p).isFile());
    if (!file) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}
await mkdir("tmp/footer-credit", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/products", "/customer-photos"]) {
      await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
      const footer = page.locator('[data-site-scope="site-footer"]');
      assert.equal(await footer.getByRole("list", { name: "Apron categories" }).count(), 0);
      assert.equal(await footer.locator('a[href^="/products/"]').count(), 0);
      assert.equal(await footer.getByRole("link", { name: "Aprons", exact: true }).getAttribute("href"), "/products");
      assert.equal(await footer.getByRole("button", { name: "Discover", exact: true }).count(), 1);
      const credit = footer.getByRole("link", { name: "Bergquist Applications", exact: true });
      assert.equal(await credit.count(), 1);
      assert.equal(await credit.getAttribute("href"), "https://bergquistapplications.com/");
      assert.equal(await footer.locator(":scope > p:last-child").innerText(), "Website made by Bergquist Applications");
      await credit.scrollIntoViewIfNeeded();
      await page.evaluate(() => document.fonts.ready);
      assert.ok(await credit.isVisible());
      const box = await credit.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width);
      await credit.focus();
      assert.ok(await credit.evaluate(el => el === document.activeElement));
      if (route === "/") await footer.screenshot({ path: `tmp/footer-credit/${width}.png` });
      console.log(`PASS: no apron sublinks; Aprons, Discover and footer credit preserved on ${route} at ${width}px`);
    }
  }
} finally {
  await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
let server;
let base = process.argv[3];
if (!base) {
  const root = path.resolve('out');
  server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (pathname === '/') file = path.join(root, 'index.html');
    else if (!path.extname(file)) file += '.html';
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
    fs.readFile(file, (error, data) => {
      if (error) res.writeHead(404).end();
      else { res.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' }); res.end(data); }
    });
  });
  await new Promise(resolve => server.listen(3078, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:3078';
}
fs.mkdirSync('tmp/catalog-ui-review', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const hydrated = () => page.waitForFunction(() => {
    const button = document.querySelector('footer button');
    return button && Object.keys(button).some(key => key.startsWith('__reactProps$'));
  });
  for (const route of ['/products', '/products/crossback', '/', '/products/crossback/ivory-slate-crossback']) {
    await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    await hydrated();
    await page.waitForTimeout(1600);
    const buttons = page.getByRole('link', { name: 'View Details', exact: true });
    assert(await buttons.count() > 0);
    const styles = await buttons.evaluateAll(links => links.map(link => {
      const style = getComputedStyle(link);
      return { height: link.offsetHeight, border: style.borderTopWidth, background: style.backgroundColor, font: style.fontFamily };
    }));
    for (const style of styles) {
      assert(style.height >= 47.9 && style.border === '1px', `${route}: ${JSON.stringify(style)}`);
      assert.notEqual(style.background, 'rgba(0, 0, 0, 0)');
      assert.match(style.font, /Geist/i);
    }
    if (route === '/products') {
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assert(await buttons.first().evaluate(el => el.scrollWidth <= el.clientWidth));
        await buttons.first().scrollIntoViewIfNeeded();
        if ([390, 1440].includes(width)) await page.screenshot({ path: `tmp/catalog-ui-review/buttons-${width}.png` });
      }
    }
    console.log(`PASS ${route}: visible filled buttons with consistent font and touch targets.`);
  }
  for (const [slug, category, price] of [
    ['ivory-slate-crossback', 'crossback', '225'],
    ['ivory-trio-half-apron', 'half-apron', '125'],
    ['charcoal-sage-standard', 'standard', '175'],
  ]) {
    await page.goto(`${base}/products/${category}/${slug}`, { waitUntil: 'domcontentloaded' });
    await hydrated();
    const typeSection = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Apron Type', exact: true }) });
    assert((await typeSection.innerText()).includes(`$${price} plus tax`));
    assert(!(await typeSection.innerText()).includes('Custom pricing'));
    assert.equal(await page.getByRole('checkbox', { name: 'Sold', exact: true }).count(), 0, 'No owner controls for guests');
    await typeSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1800);
    if (category === 'crossback') await page.screenshot({ path: 'tmp/catalog-ui-review/apron-type-price.png' });
  }
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const footer = page.locator('footer');
    const trigger = footer.getByRole('button', { name: 'Discover', exact: true });
    assert.equal(await footer.getByRole('link', { name: 'Contact', exact: true }).getAttribute('href'), '/contact');
    await trigger.scrollIntoViewIfNeeded();
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    await trigger.click();
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
    for (const label of ['Markets & Events', 'Customer Photos', 'Leather & Hardware']) {
      assert(await footer.getByRole('link', { name: label, exact: true }).isVisible());
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').innerText(), 'Markets & Events');
    if ([390, 1440].includes(width)) await page.screenshot({ path: `tmp/catalog-ui-review/footer-${width}.png` });
    await page.keyboard.press('Escape');
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    assert(await trigger.evaluate(el => el === document.activeElement));
    await trigger.click();
    await footer.getByRole('heading', { name: 'Explore', exact: true }).click();
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
  }
  await page.locator('footer').getByRole('button', { name: 'Discover', exact: true }).click();
  await page.locator('footer').getByRole('link', { name: 'Customer Photos', exact: true }).click();
  await page.waitForURL('**/customer-photos');
  assert.equal(await page.locator('footer').getByRole('button', { name: 'Discover', exact: true }).getAttribute('aria-expanded'), 'false');
  assert.deepEqual(errors, []);
  if (fs.existsSync('tmp/catalog-ui-review/sold-fixture.html')) {
    const css = fs.readdirSync('out/_next/static/chunks').filter(file => file.endsWith('.css')).map(file => fs.readFileSync(`out/_next/static/chunks/${file}`, 'utf8')).join('\n');
    await page.setContent(`<base href="${base}/"><style>${css}\nmain button img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:24px}</style>${fs.readFileSync('tmp/catalog-ui-review/sold-fixture.html', 'utf8')}`);
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.locator('img').evaluate(img => img.decode());
      assert(await page.getByRole('checkbox', { name: 'Sold', exact: true }).isChecked());
      const inside = await page.locator('[data-sold-badge]').evaluate(el => {
        const tag = el.getBoundingClientRect(), frame = el.parentElement.getBoundingClientRect();
        return tag.left >= frame.left && tag.right <= frame.right && tag.top >= frame.top && tag.bottom <= frame.bottom;
      });
      assert(inside, 'SOLD tag stays within the photo');
      await page.screenshot({ path: `tmp/catalog-ui-review/sold-owner-${width}.png` });
    }
  }
  console.log('PASS: three category prices, guest access, four responsive widths, footer keyboard/outside dismissal and navigation.');
} finally {
  await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}

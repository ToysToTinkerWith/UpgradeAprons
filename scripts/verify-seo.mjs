import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const liveOrigin = process.argv[3];
const origin = 'https://upgradeaprons.com';
const catalog = JSON.parse(fs.readFileSync('src/data/product-catalog.json', 'utf8'));
const sitemap = fs.readFileSync('out/sitemap.xml', 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
assert.equal(urls.length, catalog.length + 13);
assert.equal(new Set(urls).size, urls.length);
assert(!urls.some((url) => /\/(login|dashboard|contract|press|customer-stories)$/.test(url)));
assert.match(fs.readFileSync('out/robots.txt', 'utf8'), /Sitemap: https:\/\/upgradeaprons.com\/sitemap.xml/);

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({ javaScriptEnabled: false });
  await context.route('**/*', (route) => route.abort());
  const page = await context.newPage();
  const titles = new Set();
  const descriptions = new Set();
  for (const url of urls) {
    assert.equal(new URL(url).origin, origin);
    const pathname = new URL(url).pathname;
    const file = pathname === '/' ? 'out/index.html' : `out${pathname}.html`;
    await page.setContent(fs.readFileSync(file, 'utf8'), { waitUntil: 'domcontentloaded' });
    const metadata = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content,
      canonical: [...document.querySelectorAll('link[rel="canonical"]')].map((el) => el.href),
      ogUrl: document.querySelector('meta[property="og:url"]')?.content,
      ogImage: document.querySelector('meta[property="og:image"]')?.content,
      robots: document.querySelector('meta[name="robots"]')?.content,
      headingCount: document.querySelectorAll('h1').length,
      data: [...document.querySelectorAll('script[type="application/ld+json"]')].map((el) => JSON.parse(el.textContent)),
      links: [...document.querySelectorAll('a[href^="/"]')].map((el) => el.getAttribute('href')),
      footerCategories: [...document.querySelectorAll('footer ul[aria-label="Apron categories"] a')].map(el => el.getAttribute('href')),
    }));
    assert.deepEqual(metadata.canonical, [url], `${pathname}: canonical`);
    assert.equal(new URL(metadata.ogUrl).href, url);
    assert(metadata.ogImage.startsWith(origin));
    assert(metadata.description?.length > 40);
    assert(!metadata.robots?.includes('noindex'));
    assert.equal(metadata.headingCount, 1, `${pathname}: one H1`);
    assert(!titles.has(metadata.title), `${pathname}: duplicate title`);
    assert(!descriptions.has(metadata.description), `${pathname}: duplicate description`);
    assert(!metadata.title.includes('Half-Aprons Aprons'));
    titles.add(metadata.title);
    descriptions.add(metadata.description);
    assert(metadata.data.some((entry) => entry['@graph']?.some((node) => node['@type'] === 'Organization')));
    assert.deepEqual(metadata.footerCategories, []);
    if (pathname === '/') {
      assert.equal(metadata.title, 'Upgrade Aprons | Handcrafted Leather Aprons & Custom Designs');
      for (const target of ['/products', '/custom', '/about', '/contact', '/customer-photos']) assert(metadata.links.includes(target));
    }
    if (pathname === '/products') {
      const trail = metadata.data.find(entry => entry['@type'] === 'BreadcrumbList');
      assert.deepEqual(trail.itemListElement.map(item => item.item), [origin + '/', origin + '/products']);
      assert.equal(await page.locator('nav[aria-label="Breadcrumb"] a').getAttribute('href'), '/');
    }
    for (const href of metadata.links) {
      const target = new URL(href, origin).pathname;
      assert(target === '/' || fs.existsSync(`out${target}.html`) || fs.existsSync(`out${target}`), `${pathname}: broken link ${href}`);
    }
    const product = catalog.find((item) => pathname === `/products/${item.categorySlug}/${item.slug}`);
    if (product) {
      const markup = metadata.data.find((entry) => entry['@type'] === 'Product');
      assert(markup, `${pathname}: product markup in initial HTML`);
      assert.equal(markup.name, product.title);
      if (product.showcaseOnly) {
        assert.equal(markup.offers, undefined, 'Sold inspiration pieces must not advertise a purchase offer');
      } else {
      assert.equal(markup.offers.priceCurrency, 'USD');
      const base = product.basePrice ?? { standard: 175, crossback: 225, 'half-apron': 125 }[product.categorySlug];
      assert.equal(markup.offers.price, product.limitedEdition ? base * 1.25 : base);
      assert.equal(markup.offers.availability, undefined, 'No stale build-time stock claim');
      }
      const breadcrumbs = metadata.data.find((entry) => entry['@type'] === 'BreadcrumbList');
      assert.equal(breadcrumbs.itemListElement.at(-1).item, url);
    }
  }
  for (const ownerPath of ['/login', '/dashboard']) {
    await page.setContent(fs.readFileSync(`out${ownerPath}.html`, 'utf8'));
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  }
  for (const [, image] of sitemap.matchAll(/<image:loc>(.*?)<\/image:loc>/g)) {
    assert(fs.existsSync(path.join('public', decodeURIComponent(new URL(image).pathname))), `Missing image ${image}`);
  }
  console.log(`PASS: ${urls.length} indexable pages, unique metadata, canonical URLs, crawlable links, ${catalog.length} product schemas, image sitemap and owner noindex.`);
  await context.close();

  if (liveOrigin) {
    const live = await browser.newPage({ reducedMotion: 'reduce' });
    for (const route of ['/', '/products', '/products/half-apron', '/custom', `/products/${catalog[0].categorySlug}/${catalog[0].slug}`]) {
      const response = await live.goto(`${liveOrigin}${route}`, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200);
      assert.equal(new URL(await live.locator('link[rel="canonical"]').getAttribute('href')).href, `${origin}${route}`);
    }
    await live.waitForFunction(() => [...document.querySelectorAll('script[type="application/ld+json"]')].some((el) => JSON.parse(el.textContent).offers?.availability), undefined, { timeout: 30000 });
    const product = await live.locator('script[type="application/ld+json"]').evaluateAll((scripts) => scripts.map((script) => JSON.parse(script.textContent)).find((data) => data['@type'] === 'Product'));
    assert(['https://schema.org/InStock', 'https://schema.org/SoldOut'].includes(product.offers.availability));
    assert((await live.locator('main').innerText()).includes(`$${product.offers.price}`));
    console.log('PASS: live canonical tags, product price and current stock markup.');
    for (const route of ['/robots.txt', '/sitemap.xml']) {
      const response = await live.request.get(`${liveOrigin}${route}`);
      assert.equal(response.status(), 200);
      assert((await response.text()).includes(origin));
    }
    for (const [alias, destination] of [['/contract', '/contact'], ['/press', '/events'], ['/customer-stories', '/customer-photos']]) {
      const response = await live.request.get(`${liveOrigin}${alias}`, { maxRedirects: 0 });
      assert.equal(response.status(), 301);
      assert.equal(new URL(response.headers().location, liveOrigin).pathname, destination);
    }
    fs.mkdirSync('tmp/seo', { recursive: true });
    for (const width of [390, 1440]) {
      await live.setViewportSize({ width, height: 1000 });
      for (const route of ['/', '/products']) {
        await live.goto(`${liveOrigin}${route}`, { waitUntil: 'domcontentloaded' });
        await live.getByRole('heading', { level: 1 }).waitFor();
        await live.evaluate(() => document.fonts.ready);
        await live.waitForFunction(() => {
          let element = document.querySelector('main h1');
          while (element) {
            if (Number(getComputedStyle(element).opacity) < 1) return false;
            element = element.parentElement;
          }
          return true;
        });
        if (route === '/') {
          await live.locator('[data-workshop-copy-visible="true"]').waitFor();
          await live.locator('.workshop-apron-image').evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
        } else {
          await live.waitForFunction(() => [...document.querySelectorAll('main button[aria-pressed]')].every((element) => Number(getComputedStyle(element).opacity) === 1));
          assert.match(await live.locator('main h1').innerText(), /Leather\s*aprons\./);
          assert.match(await live.locator('main section').first().innerText(), /Browse handcrafted crossback, standard, and half aprons/);
        }
        assert(await live.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await live.screenshot({ path: `tmp/seo/${route === '/' ? 'home' : 'products'}-${width}.png` });
      }
    }
    console.log('PASS: published sitemap, robots, 301 redirects and responsive layouts.');
  }
} finally {
  await browser.close();
}

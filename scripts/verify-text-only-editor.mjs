import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const source = fs.readFileSync('src/components/SiteEditor.tsx', 'utf8');
const tree = ts.createSourceFile('SiteEditor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const helper = fs.readFileSync('src/lib/product-text.ts', 'utf8');
const compile = (text) => ts.transpileModule(text, { compilerOptions: {
  target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
const productExports = {};
vm.runInNewContext(compile(helper), { exports: productExports });
const { parseProductTextBinding, productTextPatch } = productExports;
const product = { slug: 'sample', title: 'Original', details: ['First', 'Second'], layoutTags: ['Crossback'], specs: [{ label: 'Style', value: 'Full' }], image: '/original.png' };
assert.equal(parseProductTextBinding('sample', 'imageUrl'), null);
assert.equal(parseProductTextBinding('sample', 'details', '-1'), null);
assert.equal(JSON.stringify(productTextPatch(product, { field: 'title' }, 'New')), '{"title":"New"}');
assert.equal(JSON.stringify(productTextPatch(product, { field: 'details', index: 1 }, 'New')), '{"details":["First","New"]}');
assert.equal(JSON.stringify(productTextPatch(product, { field: 'specs', index: 0, part: 'value' }, 'Half')), '{"specs":[{"label":"Style","value":"Half"}]}');
assert.equal(product.specs[0].value, 'Full');
assert.throws(() => productTextPatch(product, { field: 'imageUrl' }, '/bad.png'));

function renderEditor(owner) {
  const selection = { kind: 'content', target: { kind: 'text', label: 'Old duplicate heading' } };
  const states = [owner, selection, { value: 'Current saved wording' }, 'idle', '', 0, true];
  let index = 0;
  const exports = {};
  const mockedReact = { ...React, useState: () => [states[index++], () => {}], useEffect: () => {}, useCallback: (fn) => fn, useRef: (current) => ({ current }) };
  vm.runInNewContext(compile(source), {
    exports, document: { body: {} },
    require: (id) => {
      if (id === 'react') return mockedReact;
      if (id === 'react-dom') return { createPortal: (node) => node };
      if (id === 'next/navigation') return { usePathname: () => '/' };
      if (id === '@/lib/product-catalog') return { useProductCatalog: () => ({ products: [product] }) };
      if (id === '@/lib/product-text') return productExports;
      if (id === '@/lib/site-data') return { apronProducts: [product] };
      if (id === '@/lib/firebase') return {};
      return require(id);
    },
  });
  return renderToStaticMarkup(exports.SiteEditor());
}
const dialog = renderEditor(true);
assert.equal((dialog.match(/<textarea/g) ?? []).length, 1);
assert(dialog.includes('Current saved wording</textarea>'));
assert(!dialog.includes('Old duplicate heading'));
assert(!dialog.includes('type="file"') && !dialog.includes('Image URL') && !dialog.includes('Upload'));
assert.equal(renderEditor(false), '');
assert(!source.includes('getFirebaseStorage') && !source.includes('uploadBytes'));
console.log('PASS: product text patches preserve images; dialog has one prefilled textarea and no repeated content or image controls; non-owner has no editor.');

if (!process.argv[2]) process.exit(0);
let pointerEffect;
let openSelection;
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(tree) === 'useEffect' && node.arguments[0]?.getText(tree).includes('const handlePointerDown')) pointerEffect = node.arguments[0].getText(tree);
  if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'openSelection') openSelection = node.initializer.arguments[0].getText(tree);
  ts.forEachChild(node, visit);
}
visit(tree);
const declarations = tree.statements.filter((node) => !ts.isImportDeclaration(node) && !(ts.isFunctionDeclaration(node) && node.name?.text === 'SiteEditor')).map((node) => node.getText(tree)).join('\n');
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('pageerror', (error) => { throw error; });
    await page.setContent(`<style>body{margin:20px;font:18px sans-serif}img{display:block;width:180px;height:100px}h1{font-size:24px}section{margin-top:30px}</style>
      <main><h1>Current heading</h1><label>Name <input placeholder="Your name"></label><p><a href="tel:1234567890">123-456-7890</a></p>
      <div id="background"><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Background"></div>
      <article data-product-slug="sample"><img id="product-image" alt="Apron"><h2><span data-product-field="title">Current product name</span></h2></article></main>`);
    await page.addScriptTag({ content: 'window.exports = {};\n' + compile(`
      ${helper.replace(/^import .*;$/gm, '')}
      ${declarations}
      let isOwner = true, selection = null;
      const holdRef = { current: null }, suppressClickUntilRef = { current: 0 };
      const targetsRef = { current: collectContentTargets('/') };
      window.targets = targetsRef.current;
      window.opened = [];
      const setStatus = () => {}, setMessage = () => {};
      const setSelection = (value) => window.opened.push(value);
      const setContentDraft = (value) => window.draft = value;
      const openSelection = ${openSelection};
      window.cleanup = (${pointerEffect})();
    `) });
    const hold = async (selector, text = false) => {
      const point = await page.locator(selector).evaluate((element, useText) => {
        if (useText) { const range = document.createRange(); range.selectNodeContents(element); const r = range.getClientRects()[0]; return { x: r.x + 6, y: r.y + r.height / 2 }; }
        const r = element.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }, text);
      await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.waitForTimeout(720); await page.mouse.up();
    };
    await hold('h1', true);
    assert.equal(await page.evaluate(() => window.draft.value), 'Current heading');
    await hold('input');
    assert.equal(await page.evaluate(() => window.draft.value), 'Your name');
    await hold('a', true);
    assert.equal(await page.evaluate(() => window.draft.value), '123-456-7890');
    await hold('[data-product-field]', true);
    assert.equal(await page.evaluate(() => window.draft.value), 'Current product name');
    assert.equal(await page.evaluate(() => window.opened.at(-1).target.product.field), 'title');
    const before = await page.evaluate(() => window.opened.length);
    await hold('#background img'); await hold('#product-image');
    assert.equal(await page.evaluate(() => window.opened.length), before, 'Holding images cannot open editing');
    assert.equal(await page.locator('img[data-site-editable]').count(), 0);
    await page.locator('h1').evaluate((element) => {
      const range = document.createRange(); range.selectNodeContents(element); const r = range.getClientRects()[0];
      element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 7, button: 0, clientX: r.x + 5, clientY: r.y + 8 }));
      element.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 7 }));
    });
    await page.waitForTimeout(720);
    assert.equal(await page.evaluate(() => window.opened.length), before, 'Cancelled touch does not edit');
    await page.locator('h1').evaluate((element) => {
      const range = document.createRange(); range.selectNodeContents(element); const r = range.getClientRects()[0];
      element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 8, button: 0, clientX: r.x + 5, clientY: r.y + 8 }));
    });
    await page.waitForTimeout(720);
    assert.equal(await page.evaluate(() => window.opened.length), before + 1, 'Touch hold opens text');
    await page.evaluate(() => window.cleanup());
    const cssFiles = fs.readdirSync('out/_next/static/chunks').filter((file) => file.endsWith('.css'));
    await page.setContent(`<style>${cssFiles.map((file) => fs.readFileSync(`out/_next/static/chunks/${file}`, 'utf8')).join('\n')}</style>${dialog}`);
    await page.screenshot({ path: `tmp/editor-review/text-only-${width}.png` });
    await page.close();
    console.log(`PASS ${width}px: mouse/touch text hold, current value, placeholders, phone, product binding, image rejection, cancellation.`);
  }
} finally { await browser.close(); }

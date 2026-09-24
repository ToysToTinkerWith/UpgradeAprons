import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = ts.createSourceFile('SiteEditor.tsx', fs.readFileSync('src/components/SiteEditor.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const handlers = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node) && ['saveContent'].includes(node.name.getText(source))) {
    handlers.set(node.name.getText(source), node.initializer.getText(source));
  }
  ts.forEachChild(node, visit);
}
visit(source);

for (const name of ['saveContent', 'saveProductText']) {
  for (const outcome of ['success', 'failure', 'new-selection']) {
    test(`${name}: ${outcome}`, async () => {
      const selection = { kind: 'content', target: { kind: 'text', targetType: 'text-node', id: 'heading', ...(name === 'saveProductText' ? { product: { slug: 'test-product', field: 'title' } } : {}) } };
      let currentSelection = selection;
      let status;
      let message;
      let finish;
      let fail;
      const pending = new Promise((resolve, reject) => { finish = resolve; fail = reject; });
      const draft = Object.fromEntries(['title', 'category', 'eyebrow', 'intro', 'description', 'material', 'finish', 'priceNote', 'detailsText', 'specsText', 'layoutTagsText', 'imageUrl', 'imageStoragePath', 'accent'].map((key) => [key, 'draft']));
      const context = {
        selection, isOwner: true, products: [{ slug: 'test-product' }],
        contentDraft: { value: 'Updated text' }, productDraft: { ...draft, basePrice: '175' },
        SITE_CONTENT_COLLECTION: 'content', PRODUCT_COLLECTION: 'products',
        getFirebaseFirestore: async () => ({}),
        require: () => ({ doc: () => ({}), serverTimestamp: () => 0, setDoc: () => pending,
          runTransaction: async (_db, callback) => { await callback({ get: async () => ({ exists: () => true, data: () => ({}) }), update: () => {} }); return pending; },
        }),
        productTextPatch: () => ({ title: 'Updated text' }),
        parseLines: () => [], parseSpecs: () => [], parseTags: () => [],
        setStatus: (value) => { status = value; },
        setMessage: (value) => { message = value; },
        setSelection: (value) => { currentSelection = typeof value === 'function' ? value(currentSelection) : value; },
        Error,
      };
      const code = ts.transpileModule(`(${handlers.get('saveContent')})`, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
      const save = vm.runInNewContext(code, context);
      const saving = save();
      assert.equal(status, 'saving');
      assert.equal(currentSelection, selection, 'Keep menu open until the write succeeds');
      const newer = { kind: 'content', target: { id: 'different-heading' } };
      if (outcome === 'new-selection') currentSelection = newer;
      if (outcome === 'failure') fail(new Error('Save failed'));
      else finish();
      await saving;
      assert.equal(status, outcome === 'failure' ? 'error' : 'saved');
      assert.equal(currentSelection, outcome === 'failure' ? selection : outcome === 'new-selection' ? newer : null);
      if (outcome === 'failure') assert.equal(message, 'Save failed');
    });
  }
}

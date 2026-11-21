import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const cliDirectory = process.argv[2];
if (!cliDirectory) throw new Error('Pass the firebase-tools package directory.');
const auth = await import(pathToFileURL(path.join(cliDirectory, 'lib/auth.js')).href);
const account = auth.getProjectDefaultAccount(process.cwd());
if (!account) throw new Error('Run firebase login first.');
const token = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
const base = 'https://firestore.googleapis.com/v1/projects/upgradeaprons/databases/(default)/documents';
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: {
    Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json',
  } });
  const body = await response.json();
  if (!response.ok) throw new Error(`Firestore ${response.status}: ${body.error?.message}`);
  return body;
}

const routes = ['/', '/products', '/products/standard', '/products/crossback', '/products/half-apron'];
const records = await request(`${base}:runQuery`, {
  method: 'POST',
  body: JSON.stringify({ structuredQuery: {
    from: [{ collectionId: 'siteContent' }],
    where: { fieldFilter: { field: { fieldPath: 'route' }, op: 'IN', value: { arrayValue: { values: routes.map((route) => ({ stringValue: route })) } } } },
  } }),
});
const candidates = records.map((record) => record.document).filter((document) => {
  if (!document || document.fields.kind.stringValue !== 'text') return false;
  const text = document.fields.value.stringValue.replace(/\s+/g, ' ').trim();
  return /^(Explore the|work\.|Browse |Repurposed genuine|Full-front leather aprons|Classic neck-strap|Waist-height leather)/.test(text);
});
for (const document of candidates) {
  console.log(JSON.stringify({ key: document.fields.key.stringValue, value: document.fields.value.stringValue }));
}

// This list is deliberately exact: never replace owner text that changed since inspection.
const updates = new Map([
  ['route:/products|section:1/h1:1|text:0', {
    expected: 'Explore the', value: 'Leather',
  }],
  ['route:/products|section:1/h1:1/span:1|text:0', {
    expected: 'work.', value: 'aprons.',
  }],
  ['route:/products|section:1/p:2|text:0', {
    expected: 'Browse standard and half apron builds, then open a detail page for material, pocket layout, finish, and custom-order notes.',
    value: 'Browse handcrafted crossback, standard, and half aprons, then open a detail page for pocket layout, build details, and custom-order notes.',
  }],
]);
if (process.argv.includes('--apply')) {
  if (!updates.size) throw new Error('No inspected text updates configured.');
  const writes = [];
  const backups = [];
  for (const [key, { expected, value }] of updates) {
    const document = records.map((record) => record.document).find((document) => document?.fields.key.stringValue === key);
    if (!document) throw new Error(`Missing content entry: ${key}`);
    const current = document.fields.value.stringValue.replace(/\s+/g, ' ').trim();
    if (current === value) continue;
    if (current !== expected) throw new Error(`Owner text changed: ${key}. No changes made.`);
    backups.push(document);
    writes.push({
      update: { name: document.name, fields: {
        value: { stringValue: value },
        defaultValue: { stringValue: value },
        updatedAt: { timestampValue: new Date().toISOString() },
      } },
      updateMask: { fieldPaths: ['value', 'defaultValue', 'updatedAt'] },
      currentDocument: { updateTime: document.updateTime },
    });
  }
  if (writes.length) {
    const backup = `product-intake/backups/seo-content-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.writeFileSync(backup, JSON.stringify(backups, null, 2), { flag: 'wx' });
    await request(`${base}:commit`, { method: 'POST', body: JSON.stringify({ writes }) });
    console.log(`Updated ${writes.length} inspected entries. Backup: ${backup}`);
  }
}

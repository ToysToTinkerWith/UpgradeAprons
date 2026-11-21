// Run with the installed firebase-tools directory to reuse its authorized account.
// A timestamped backup is required before the explicitly requested replacement.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function main() {
  const cliDirectory = process.argv[2];
  const apply = process.argv.includes('--apply');
  const refreshImages = process.argv.includes('--refresh-images');
  const imagesOnly = process.argv.includes('--images-only');
  const addOnly = process.argv.includes('--add-only');
  const onlySlug = process.argv.find((argument) => argument.startsWith('--slug='))?.slice(7);
  if (addOnly && (imagesOnly || refreshImages)) throw new Error('--add-only cannot be combined with image updates.');
  if (onlySlug && !imagesOnly && !addOnly) throw new Error('--slug requires --images-only or --add-only.');
  if (!cliDirectory) throw new Error('Pass the firebase-tools package directory.');
  const auth = await import(pathToFileURL(path.join(cliDirectory, 'lib/auth.js')).href);
  const account = auth.getProjectDefaultAccount(process.cwd());
  if (!account) throw new Error('Run firebase login first.');
  const token = await auth.getAccessToken(account.tokens.refresh_token, [
    'https://www.googleapis.com/auth/cloud-platform',
  ]);
  const base = 'https://firestore.googleapis.com/v1/projects/upgradeaprons/databases/(default)/documents';
  const request = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    });
    const body = await response.json();
    if (!response.ok) throw new Error(`Firestore ${response.status}: ${body.error?.message}`);
    return body;
  };
  const documents = [];
  let pageToken;
  do {
    const url = new URL(`${base}/products`);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const page = await request(url);
    documents.push(...(page.documents ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  const allProducts = JSON.parse(fs.readFileSync('src/data/product-catalog.json', 'utf8'));
  const catalog = onlySlug ? allProducts.filter((product) => product.slug === onlySlug) : allProducts;
  if (onlySlug && catalog.length !== 1) throw new Error(`Unknown or duplicate product slug: ${onlySlug}`);
  const keep = new Set(catalog.map((product) => product.slug));
  const obsolete = imagesOnly || addOnly ? [] : documents.filter((document) => !keep.has(document.name.split('/').pop()));
  console.log(JSON.stringify({
    existing: documents.map((document) => document.name.split('/').pop()),
    remove: obsolete.map((document) => document.name.split('/').pop()),
    retain: [...keep], apply,
  }, null, 2));
  if (!apply) return;

  const backup = `product-intake/backups/products-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  fs.writeFileSync(backup, JSON.stringify({ project: 'upgradeaprons', documents }, null, 2), { flag: 'wx' });
  const encode = (value) => {
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (typeof value === 'number') return { doubleValue: value };
    if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, val]) => [key, encode(val)])) } };
  };
  const writes = obsolete.map((document) => ({
    delete: document.name,
    currentDocument: { updateTime: document.updateTime },
  }));
  for (const product of catalog) {
    const name = `projects/upgradeaprons/databases/(default)/documents/products/${product.slug}`;
    const existing = documents.find((document) => document.name === name);
    if (existing) {
      if ((refreshImages || imagesOnly) && existing.fields?.image?.stringValue !== product.image) writes.push({
        update: { name, fields: { image: encode(product.image) } },
        updateMask: { fieldPaths: ['image'] },
        currentDocument: { updateTime: existing.updateTime },
      });
      continue;
    }
    if (!imagesOnly) writes.push({ update: { name, fields: encode(product).mapValue.fields }, currentDocument: { exists: false } });
  }
  if (writes.length > 450) throw new Error('Catalog exceeds single-commit limit. No changes made.');
  if (writes.length) await request(`${base}:commit`, { method: 'POST', body: JSON.stringify({ writes }) });
  console.log(`${addOnly ? 'Added missing products' : imagesOnly ? 'Updated existing product images' : 'Replaced catalog'}. Backup: ${backup}`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });

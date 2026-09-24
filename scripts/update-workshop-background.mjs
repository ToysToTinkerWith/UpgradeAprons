import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const cliDirectory = process.argv[2];
if (!cliDirectory) throw new Error('Pass the firebase-tools package directory.');
const auth = await import(pathToFileURL(path.join(cliDirectory, 'lib/auth.js')).href);
const account = auth.getProjectDefaultAccount(process.cwd());
if (!account) throw new Error('Run firebase login first.');
const token = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
const base = 'https://firestore.googleapis.com/v1/';
const name = 'projects/upgradeaprons/databases/(default)/documents/siteContent/content-1ee0j5z-xjmhbh';
const newImage = '/images/workshop-table-scaled-tools-v6.png';
const request = async (url, options = {}) => {
  const response = await fetch(url, { ...options, headers: {
    Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json',
  } });
  const body = await response.json();
  if (!response.ok) throw new Error(`Firestore ${response.status}: ${body.error?.message}`);
  return body;
};
const document = await request(base + name);
if (document.fields.key.stringValue !== 'global:workshop-table|img:1|image' || document.fields.kind.stringValue !== 'image') {
  throw new Error('Unexpected site content target. No changes made.');
}
if (document.fields.value.stringValue === newImage) {
  console.log('Craftsman workshop background is already saved.');
} else {
  if (document.fields.value.stringValue !== '/images/workshop-table-craftsman-v5.png') {
    throw new Error('The owner has changed the background. No changes made.');
  }
  console.log(`Homepage background: ${document.fields.value.stringValue} -> ${newImage}`);
  if (process.argv.includes('--apply')) {
    const asset = await fetch(`https://upgradeaprons.web.app${newImage}`, { method: 'HEAD' });
    if (!asset.ok || !asset.headers.get('content-type')?.startsWith('image/')) {
      throw new Error('Deploy the new image before updating the saved reference.');
    }
    const backup = `product-intake/backups/workshop-background-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.writeFileSync(backup, JSON.stringify(document, null, 2), { flag: 'wx' });
    const alt = "Leather-covered craftsman's workbench with tools set along the far top rim";
    const fields = Object.fromEntries(Object.entries({ value: newImage, defaultValue: newImage, alt, defaultAlt: alt, label: 'Leather-covered craftsman workbench' })
      .map(([key, value]) => [key, { stringValue: value }]));
    fields.updatedAt = { timestampValue: new Date().toISOString() };
    await request(`${base}projects/upgradeaprons/databases/(default)/documents:commit`, {
      method: 'POST', body: JSON.stringify({ writes: [{
        update: { name, fields }, updateMask: { fieldPaths: Object.keys(fields) },
        currentDocument: { updateTime: document.updateTime },
      }] }),
    });
    console.log(`Updated only the workshop background. Backup: ${backup}`);
  }
}

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function planSizeUpdates(catalog, documents, review = [], fillReviewedPending = false) {
  const writes = [], skipped = [];
  for (const product of catalog.filter(p => p.categorySlug === "standard" && (review.some(r => r.slug === p.slug) || (p.standardSizeEstimated && ["small", "large"].includes(p.standardSize))))) {
    const document = documents.find(doc => doc.name.split("/").pop() === product.slug);
    if (!document) { skipped.push({ slug: product.slug, reason: "Missing live product" }); continue; }
    const fields = document.fields ?? {};
    const reviewed = review.find(r => r.slug === product.slug);
    if (reviewed && (reviewed.standardSize ?? null) !== (product.standardSize ?? null)) throw new Error(`Review/catalog mismatch: ${product.slug}`);
    // Re-review may replace prior estimates, never confirmed owner sizes.
    const replaceEstimate = reviewed && fields.standardSizeEstimated?.booleanValue === true;
    const fillPending = fillReviewedPending && reviewed?.bestGuessRequested === true
      && (!fields.standardSize || "nullValue" in fields.standardSize);
    if (("standardSize" in fields && !replaceEstimate && !fillPending) || ("measurements" in fields && !((replaceEstimate || fillPending) && "nullValue" in fields.measurements))) {
      skipped.push({ slug: product.slug, reason: "Preserved existing size or measurements" }); continue;
    }
    if (fields.imageUrl?.stringValue || (fields.image?.stringValue && fields.image.stringValue !== product.image)) {
      skipped.push({ slug: product.slug, reason: "Live photo differs from reviewed photo" }); continue;
    }
    if (!document.updateTime) throw new Error(`Missing concurrency guard: ${product.slug}`);
    const size = product.standardSize ?? null;
    const estimated = Boolean(size && product.standardSizeEstimated);
    const currentSize = fields.standardSize?.stringValue ?? null;
    if (currentSize === size && (fields.standardSizeEstimated?.booleanValue ?? false) === estimated) continue;
    writes.push({
      update: { name: document.name, fields: {
        standardSize: size ? { stringValue: size } : { nullValue: null },
        standardSizeEstimated: { booleanValue: estimated },
      } },
      updateMask: { fieldPaths: ["standardSize", "standardSizeEstimated"] },
      currentDocument: { updateTime: document.updateTime },
    });
  }
  return { writes, skipped };
}

async function main() {
  const cliDirectory = process.argv[2];
  if (!cliDirectory) throw new Error("Pass the firebase-tools package directory.");
  const auth = await import(pathToFileURL(path.join(cliDirectory, "lib/auth.js")).href);
  const account = auth.getProjectDefaultAccount(process.cwd());
  if (!account) throw new Error("Run firebase login first.");
  const token = await auth.getAccessToken(account.tokens.refresh_token, ["https://www.googleapis.com/auth/cloud-platform"]);
  const base = "https://firestore.googleapis.com/v1/projects/upgradeaprons/databases/(default)/documents";
  const request = async (url, options = {}) => {
    const response = await fetch(url, { ...options, headers: {
      Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json",
    } });
    const body = await response.json();
    if (!response.ok) throw new Error(`Firestore ${response.status}: ${body.error?.message}`);
    return body;
  };
  const documents = [];
  let pageToken;
  do {
    const url = new URL(`${base}/products`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const page = await request(url);
    documents.push(...(page.documents ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  const catalog = JSON.parse(fs.readFileSync("src/data/product-catalog.json", "utf8"));
  const review = process.argv.includes("--review-front-pockets")
    ? JSON.parse(fs.readFileSync("product-intake/standard-sizing/front-pocket-review.json", "utf8")).products : [];
  const plan = planSizeUpdates(catalog, documents, review, process.argv.includes("--fill-reviewed-pending"));
  console.log(JSON.stringify({ update: plan.writes.map(w => w.update.name.split("/").pop()), skipped: plan.skipped }, null, 2));
  if (!process.argv.includes("--apply") || !plan.writes.length) return;
  const backup = `product-intake/backups/sizing-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  fs.writeFileSync(backup, JSON.stringify({ project: "upgradeaprons", documents }, null, 2), { flag: "wx" });
  await request(`${base}:commit`, { method: "POST", body: JSON.stringify({ writes: plan.writes }) });
  console.log(`Updated ${plan.writes.length} photo-estimated sizes. Backup: ${backup}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}

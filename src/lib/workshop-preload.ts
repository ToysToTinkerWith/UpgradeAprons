import type { ApronProduct } from "@/lib/site-data";
import { getProductImageSrc } from "@/lib/product-pricing";
import { workshopCategories } from "@/lib/workshop-selection";

export const workshopSelectionKey = "upgrade-aprons-workshop-selection";

type PreloadedProduct = { slug: string; categorySlug: string; image: string };

declare global {
  interface Window {
    __upgradeApronsPreload?: { products: PreloadedProduct[]; consumed: boolean };
  }
}

// Runs in the document head before the application bundle or hydration.
export function createWorkshopPreloadScript(products: ApronProduct[]) {
  const candidates = products
    .filter((product) => workshopCategories.some((category) => category === product.categorySlug))
    .map((product) => ({ slug: product.slug, categorySlug: product.categorySlug, image: getProductImageSrc(product) }));
  const serialize = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
  return `(() => {
    if (location.pathname !== "/") return;
    const candidates = ${serialize(candidates)};
    const categories = ${serialize(workshopCategories)};
    const key = ${serialize(workshopSelectionKey)};
    let previous = {};
    try {
      const stored = JSON.parse(sessionStorage.getItem(key) || "{}");
      if (stored && typeof stored === "object" && !Array.isArray(stored)) previous = stored;
    } catch {}
    const selected = categories.flatMap((category) => {
      const available = candidates.filter((product) => product.categorySlug === category);
      const alternatives = available.filter((product) => product.slug !== previous[category]);
      const pool = alternatives.length ? alternatives : available;
      return pool.length ? [pool[Math.floor(Math.random() * pool.length)]] : [];
    });
    window.__upgradeApronsPreload = { products: selected, consumed: false };
    for (const product of selected) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = product.image;
      link.fetchPriority = "high";
      link.dataset.workshopPreload = product.slug;
      document.head.appendChild(link);
    }
    try {
      sessionStorage.setItem(key, JSON.stringify(Object.fromEntries(selected.map((product) => [product.categorySlug, product.slug]))));
    } catch {}
  })();`;
}

export function takePreloadedWorkshopProducts(products: ApronProduct[]) {
  const early = window.__upgradeApronsPreload;
  if (!early || early.consumed) return null;
  early.consumed = true;
  const selected = early.products.flatMap((preloaded) => {
    const product = products.find((item) => item.slug === preloaded.slug
      && item.categorySlug === preloaded.categorySlug && getProductImageSrc(item) === preloaded.image);
    return product ? [product] : [];
  });
  return selected.length && selected.length === early.products.length ? selected : null;
}

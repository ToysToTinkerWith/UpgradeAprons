import type { ApronProduct } from "@/lib/site-data";

export const workshopCategories = ["standard", "half-apron", "crossback"] as const;

export function selectWorkshopProducts(
  products: ApronProduct[],
  previous: Record<string, string> = {},
  random: () => number = Math.random,
) {
  return workshopCategories.flatMap((category) => {
    const available = products.filter((product) => product.categorySlug === category);
    const alternatives = available.filter((product) => product.slug !== previous[category]);
    const pool = alternatives.length ? alternatives : available;
    if (!pool.length) return [];
    return [pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]];
  });
}

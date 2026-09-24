import type { ApronProduct } from "@/lib/site-data";

export const PRODUCT_BASE_PRICES_BY_CATEGORY: Record<string, number> = {
  "half-apron": 125,
  standard: 175,
  crossback: 225,
};

export function getProductBasePrice(product: ApronProduct) {
  return (
    product.basePrice ??
    PRODUCT_BASE_PRICES_BY_CATEGORY[product.categorySlug] ??
    PRODUCT_BASE_PRICES_BY_CATEGORY.standard
  );
}

export function getProductPrice(product: ApronProduct) {
  const basePrice = getProductBasePrice(product);

  return product.limitedEdition ? basePrice * 1.25 : basePrice;
}

export function formatProductPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getProductPriceLabel(product: ApronProduct) {
  return `${formatProductPrice(getProductPrice(product))} plus tax`;
}

export function getProductImageSrc(product: ApronProduct) {
  return product.imageUrl || product.image;
}

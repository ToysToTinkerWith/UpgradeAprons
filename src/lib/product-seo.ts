import type { ApronProduct } from "@/lib/site-data";
import { getProductHref } from "@/lib/site-data";
import { getProductImageSrc, getProductPrice } from "@/lib/product-pricing";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

export function productStructuredData(product: ApronProduct, availabilityReady: boolean) {
  const url = absoluteUrl(getProductHref(product));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.title,
    description: product.description,
    url,
    image: [getProductImageSrc(product), ...(product.alternateImages ?? [])].map(absoluteUrl),
    category: product.category,
    brand: { "@type": "Brand", name: SITE_NAME },
    ...(product.showcaseOnly ? {} : { offers: {
      "@type": "Offer",
      url,
      priceCurrency: "USD",
      price: getProductPrice(product),
      // Sold status is owner-managed. Do not publish a stale build-time stock claim.
      ...(availabilityReady ? {
        availability: product.sold ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      } : {}),
      seller: { "@id": absoluteUrl("/#organization") },
    } }),
  };
}

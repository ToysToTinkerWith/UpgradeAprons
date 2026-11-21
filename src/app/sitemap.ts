import type { MetadataRoute } from "next";
import { apronCategories, apronProducts, getCategoryHref, getProductHref } from "@/lib/site-data";
import { getProductImageSrc } from "@/lib/product-pricing";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...["/", "/products", "/custom", "/about", "/leather-hardware", "/customer-photos", "/events", "/contact", "/product-development"]
      .map((path) => ({ url: absoluteUrl(path) })),
    ...apronCategories.map((category) => ({
      url: absoluteUrl(getCategoryHref(category)),
      images: [absoluteUrl(category.image)],
    })),
    ...apronProducts.map((product) => ({
      url: absoluteUrl(getProductHref(product)),
      images: [getProductImageSrc(product), ...(product.alternateImages ?? [])].map(absoluteUrl),
    })),
  ];
}

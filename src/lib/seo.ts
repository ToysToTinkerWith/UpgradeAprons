import type { Metadata } from "next";

export const SITE_URL = "https://upgradeaprons.com";
export const SITE_NAME = "Upgrade Aprons";
export const DEFAULT_SOCIAL_IMAGE = "/og-craft-character-20261004.png";

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function pageMetadata({
  title,
  description,
  path,
  image = DEFAULT_SOCIAL_IMAGE,
  brandFirst = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  brandFirst?: boolean;
}): Metadata {
  const fullTitle = brandFirst ? `${SITE_NAME} | ${title}` : `${title} | ${SITE_NAME}`;
  return {
    title: fullTitle,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: absoluteUrl(path),
      title: fullTitle,
      description,
      images: [{ url: absoluteUrl(image), alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [absoluteUrl(image)],
    },
  };
}

export function categorySeoTitle(slug: string) {
  return {
    standard: "Standard Leather Aprons",
    crossback: "Crossback Leather Aprons",
    "half-apron": "Leather Half Aprons",
    custom: "Custom Leather Aprons | Completed Commissions",
  }[slug] ?? "Handcrafted Leather Aprons";
}

export function breadcrumbData(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

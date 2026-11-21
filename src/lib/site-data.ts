import catalog from "@/data/product-catalog.json";
import { normalizeStandardSize } from "@/lib/product-sizing";

export type ApronProduct = {
  slug: string;
  categorySlug: string;
  title: string;
  category: string;
  eyebrow: string;
  intro: string;
  description: string;
  image: string;
  alternateImages?: string[];
  accent: string;
  material: string;
  finish: string;
  priceNote: string;
  details: string[];
  specs: { label: string; value: string }[];
  layoutTags: string[];
  basePrice?: number;
  limitedEdition?: boolean;
  sold?: boolean;
  showcaseOnly?: boolean;
  standardSize?: "small" | "large" | null;
  standardSizeEstimated?: boolean;
  measurements?: { bodyWidthInches: number; bodyLengthInches: number } | null;
  imageUrl?: string;
  imageStoragePath?: string;
};

export type ApronCategory = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  image: string;
  accent: string;
};

export const apronProducts: ApronProduct[] = catalog.map(product => ({
  ...product,
  standardSize: normalizeStandardSize(product.standardSize),
}));

export const apronCategories: ApronCategory[] = [
  {
    slug: "crossback",
    title: "Crossback",
    eyebrow: "Crossed shoulder straps",
    description:
      "Handcrafted crossback leather aprons with crossed webbing straps, clip-on shoulder attachments, and practical pockets for kitchens, gardens, and workshops.",
    image: "/images/products/saddle-sky-crossback-v2.webp",
    accent: "#78a9c4",
  },
  {
    slug: "standard",
    title: "Standard",
    eyebrow: "Classic apron",
    description:
      "Handmade standard leather aprons with classic neck straps, waist ties, and full-front pocket layouts for cooking, gardening, and creative work.",
    image: "/images/products/burgundy-bloom-standard-v3.webp",
    accent: "#b95438",
  },
  {
    slug: "half-apron",
    title: "Half-Aprons",
    eyebrow: "Waist-height apron",
    description:
      "Handcrafted leather half aprons with waist-height coverage and practical pockets for gardening, market stalls, and studio work. Explore distinctive color combinations.",
    image: "/images/products/lavender-colorblock-half-apron-v1.webp",
    accent: "#2b8c86",
  },
  {
    slug: "custom",
    title: "Custom",
    eyebrow: "Completed commissions",
    description:
      "One-of-a-kind aprons made around individual tools, tasks, and ideas. These sold commissions are here for inspiration. Start a custom design to create a piece of your own.",
    image: "/images/products/graphite-utility-custom-v1.webp",
    accent: "#8ca9b9",
  },
];

export const processSteps = [
  {
    step: "01",
    title: "Submit the draft",
    copy: "Send the custom design layout with contact details, intended use, wearer notes, and any pocket or color direction.",
  },
  {
    step: "02",
    title: "Confirm the leather",
    copy: "Crispin gets in touch with a design confirmation and pictures of leathers that are currently in stock.",
  },
  {
    step: "03",
    title: "Approve and pay",
    copy: "The user agrees to the final layout and pays for the design Crispin lays out to match the original draft as closely as possible.",
  },
  {
    step: "04",
    title: "Craft and ship",
    copy: "After payment is received, the apron is crafted, finished, checked, and shipped to the user.",
  },
];

export const testimonials = [
  {
    quote:
      "Thoughtful enough to feel special, practical enough to put straight to work.",
    name: "Market customer",
    context: "Custom leather apron",
  },
  {
    quote:
      "The leather has character before the apron even starts its next life.",
    name: "Studio buyer",
    context: "Genuine leather",
  },
  {
    quote:
      "A useful piece that feels personal instead of mass-produced.",
    name: "Gift order",
    context: "Custom build",
  },
];

export const customFaqItems = [
  {
    question: "Can I choose the exact leather colors?",
    answer:
      "You can guide the color direction. Exact options depend on the leather currently available, which keeps each build limited and distinct.",
  },
  {
    question: "What details are useful for a custom request?",
    answer:
      "Share the intended use, wearer height, preferred coverage, tool or pocket needs, and any colors you like or want to avoid.",
  },
  {
    question: "Are the aprons only for makers?",
    answer:
      "No. Upgrade Aprons can be built for cooks, gardeners, florists, vendors, artists, studios, small businesses, and gift orders.",
  },
];

export const storyCards = [
  {
    eyebrow: "Our Story",
    title: "Four decades of craft.",
    copy: [
      "Crispin brings more than 40 years of furniture upholstery experience to every apron, with deep knowledge of leather, hardware, stitching, and fit.",
      "Upgrade Aprons grew from that practical craft background into useful pieces made for kitchens, studios, gardens, markets, and workshops.",
    ],
  },
  {
    eyebrow: "Built for the Future",
    title: "Genuine leather with another life.",
    copy: [
      "Repurposed genuine leather remnants give each apron its own past before becoming part of someone else's daily work.",
      "The result is sustainable by design, durable in use, and visually distinct from mass-produced workwear.",
    ],
  },
];

export const pressCards = [
  {
    title: "Market Days on Whidbey",
    source: "Upgrade Aprons Notes",
    date: "Local craft markets",
    copy:
      "Customers can handle the leather, try on aprons, and talk directly through fit, pocket needs, and color direction.",
  },
  {
    title: "Custom Work Requests",
    source: "Customer Builds",
    date: "Open year-round",
    copy:
      "A direct order process helps turn trade-specific requirements into aprons that feel personal and useful.",
  },
  {
    title: "Genuine Leather Practice",
    source: "Studio Process",
    date: "Ongoing",
    copy:
      "Each build begins with available genuine leather, making every finished apron a limited, material-led piece.",
  },
];

export const resourceLinks = [
  {
    label: "Custom Orders",
    href: "/custom",
  },
  {
    label: "Apron Catalog",
    href: "/products",
  },
  {
    label: "About the Craft",
    href: "/about",
  },
];

export function getProductHref(product: ApronProduct) {
  return `/products/${product.categorySlug}/${product.slug}`;
}

export function getCategoryHref(category: ApronCategory) {
  return `/products/${category.slug}`;
}

export function getCategoryBySlug(slug: string) {
  return apronCategories.find((category) => category.slug === slug);
}

export function getProductsByCategorySlug(slug: string) {
  return apronProducts.filter((product) => product.categorySlug === slug);
}

export function findProductBySegments(segments: string[] = []) {
  const slug = segments[segments.length - 1];

  return apronProducts.find((product) => product.slug === slug);
}

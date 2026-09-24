"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronUp,
  Ruler,
  Scissors,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ProductImageViewer } from "@/components/ProductImageViewer";
import { ProductPrice } from "@/components/ProductPrice";
import { CatalogEmptyState } from "@/components/CatalogEmptyState";
import { useProductCatalog } from "@/lib/product-catalog";
import { getProductImageSrc } from "@/lib/product-pricing";
import {
  apronCategories,
  apronProducts,
  getCategoryHref,
  getProductHref,
} from "@/lib/site-data";

const ALL_CATEGORIES = "All";
const easeOut = [0.22, 1, 0.36, 1] as const;

const iconMap: Record<string, LucideIcon> = {
  Standard: Ruler,
  "Half-Aprons": Scissors,
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: easeOut },
  },
};

const cardReveal: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.85, ease: easeOut },
  },
};

export function ProductsPage() {
  const reduceMotion = useReducedMotion();
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES);
  const { products: catalogProducts } = useProductCatalog(apronProducts);

  const filteredProducts = useMemo(() => {
    if (activeCategory === ALL_CATEGORIES) {
      return catalogProducts;
    }

    return catalogProducts.filter((product) => product.category === activeCategory);
  }, [activeCategory, catalogProducts]);

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#050403] px-6 pb-24 pt-36 text-[#f7f1e8] sm:px-10 sm:pt-40 lg:px-12 lg:pb-32 lg:pt-44">
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_22%,rgba(214,162,95,0.14),transparent_30%),radial-gradient(circle_at_84%_18%,rgba(43,140,134,0.12),transparent_28%),linear-gradient(180deg,#050403_0%,#090604_48%,#050403_100%)]"
        aria-hidden="true"
      />

      <motion.section
        className="mx-auto mb-14 max-w-[58rem] text-center sm:mb-18"
        variants={stagger}
        initial={reduceMotion ? false : "hidden"}
        animate={reduceMotion ? undefined : "visible"}
      >
        <motion.p
          className="inline-flex items-center justify-center gap-4 text-[0.82rem] font-bold uppercase tracking-[0.24em] text-[#e7ad61] sm:text-[0.95rem]"
          variants={fadeUp}
        >
          <Scissors size={30} strokeWidth={1.45} aria-hidden="true" />
          <span>Our Aprons</span>
        </motion.p>
        <motion.h1
          className="font-display mt-7 text-6xl font-semibold leading-[0.96] text-[#f8f2e9] sm:text-7xl lg:text-8xl"
          variants={fadeUp}
        >
          Explore the
          <span className="text-[#e7ad61]"> work.</span>
        </motion.h1>
        <motion.div
          className="mx-auto my-7 h-[3px] w-16 bg-[#d6a25f]"
          variants={fadeUp}
        />
        <motion.p
          className="mx-auto max-w-[46rem] text-lg leading-8 text-[#d8cabc] sm:text-xl"
          variants={fadeUp}
        >
          Browse crossback, standard, and half apron builds, then open a detail page for
          material, pocket layout, finish, and custom-order notes.
        </motion.p>
      </motion.section>

      <motion.div
        className="mx-auto mb-12 flex max-w-[80rem] flex-wrap justify-center gap-3"
        variants={stagger}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.2 }}
      >
        {[ALL_CATEGORIES, ...apronCategories.map((category) => category.title)].map((category) => {
          const isActive = activeCategory === category;
          const count =
            category === ALL_CATEGORIES
              ? catalogProducts.length
              : catalogProducts.filter((product) => product.category === category)
                  .length;

          return (
            <motion.button
              aria-pressed={isActive}
              className={`inline-flex min-h-12 items-center gap-3 rounded-full border px-5 text-xs font-bold uppercase tracking-[0.16em] transition duration-200 ${
                isActive
                  ? "border-[#d6a25f] bg-[#d6a25f]/16 text-white shadow-[0_0_24px_rgba(214,162,95,0.16)]"
                  : "border-[#d6a25f]/42 bg-[#0e0906]/72 text-white/76 hover:-translate-y-0.5 hover:border-[#d6a25f] hover:text-white"
              }`}
              key={category}
              onClick={() => setActiveCategory(category)}
              type="button"
              variants={fadeUp}
            >
              <span
                data-site-scope={`apron-category-${apronCategories.find((item) => item.title === category)?.slug ?? "all"}`}
              >
                {category}
              </span>
              <strong className="inline-flex size-6 items-center justify-center rounded-full border border-[#d6a25f]/40 bg-black/28 text-[#e7ad61]">
                <span data-site-static>{count}</span>
              </strong>
            </motion.button>
          );
        })}
      </motion.div>

      <motion.section
        className="mx-auto grid max-w-[112rem] gap-6 md:grid-cols-2 xl:grid-cols-4"
        variants={stagger}
        initial={reduceMotion ? false : "hidden"}
        animate={reduceMotion ? undefined : "visible"}
        key={activeCategory}
      >
        {filteredProducts.length === 0 ? <CatalogEmptyState /> : null}
        {filteredProducts.map((product) => {
          const Icon = iconMap[product.category] ?? Scissors;

          return (
            <motion.article
              className="group relative flex min-h-[42rem] flex-col overflow-hidden rounded-lg border border-white/16 bg-[#0e0906]/72 p-6 shadow-[0_24px_62px_rgba(0,0,0,0.34)] backdrop-blur-md"
              data-product-slug={product.slug}
              key={product.slug}
              variants={cardReveal}
            >
              <div
                className="pointer-events-none absolute -right-8 top-6 font-display text-8xl font-semibold text-white/[0.035]"
                aria-hidden="true"
              >
                UA
              </div>
              <div
                className="mb-6 inline-flex size-14 items-center justify-center rounded-full border"
                style={{ borderColor: product.accent, color: product.accent }}
              >
                <Icon size={28} strokeWidth={1.35} aria-hidden="true" />
              </div>
              <ProductImageViewer
                src={getProductImageSrc(product)}
                alt={product.title}
                sizes="(min-width: 1280px) 24vw, (min-width: 768px) 48vw, 100vw"
                frameClassName="mb-7 aspect-[1.06] overflow-hidden rounded-md bg-[radial-gradient(circle_at_50%_38%,rgba(214,162,95,0.14),transparent_56%),linear-gradient(145deg,#18110d,#070504)]"
                imageClassName="object-contain object-center p-5 transition duration-700 group-hover:scale-[1.035]"
              />
              <div className="flex flex-1 flex-col">
                <p
                  className="text-xs font-bold uppercase tracking-[0.18em]"
                  style={{ color: product.accent }}
                >
                  <Link
                    href={getCategoryHref(
                      apronCategories.find(
                        (category) => category.slug === product.categorySlug,
                      ) ?? apronCategories[0],
                    )}
                    className="transition hover:text-white"
                  >
                    <span data-product-field="category">{product.category}</span>
                  </Link>
                </p>
                <h2 className="font-display mt-4 text-4xl font-semibold leading-none text-white">
                  <span data-product-field="title">{product.title}</span>
                </h2>
                <div
                  className="my-6 h-px w-14"
                  style={{ backgroundColor: product.accent }}
                />
                <p className="text-base leading-7 text-[#d8cabc]">
                  <span data-product-field="intro">{product.intro}</span>
                </p>
                <ProductPrice product={product} className="mt-6" />
                <div className="mt-7 grid grid-cols-2 gap-5 border-t border-white/12 pt-6 text-sm">
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-[0.14em] text-[#e7ad61]">
                      Material
                    </span>
                    <strong className="mt-2 block font-medium text-white/86">
                      <span data-product-field="material">{product.material}</span>
                    </strong>
                  </div>
                  <div className="border-l border-white/18 pl-5">
                    <span className="block text-xs font-bold uppercase tracking-[0.14em] text-[#e7ad61]">
                      Finish
                    </span>
                    <strong className="mt-2 block font-medium text-white/86">
                      <span data-product-field="finish">{product.finish}</span>
                    </strong>
                  </div>
                </div>
                <Link
                  href={getProductHref(product)}
                  className="mt-auto inline-flex pt-8 text-sm font-semibold uppercase tracking-[0.18em] text-[#e7ad61] transition hover:text-white"
                >
                  View Details
                </Link>
              </div>
            </motion.article>
          );
        })}
      </motion.section>

      <div className="mx-auto mt-14 flex max-w-[112rem] justify-center">
        <button
          type="button"
          aria-label="Back to top"
          className="inline-flex size-14 items-center justify-center rounded-full border border-[#d6a25f]/80 bg-black/28 text-[#e7ad61] shadow-[0_0_24px_rgba(214,162,95,0.16)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a25f]/12 hover:text-white"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ChevronUp size={26} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Recycle,
  Ruler,
  Scissors,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ProductImageViewer } from "@/components/ProductImageViewer";
import { ProductPrice } from "@/components/ProductPrice";
import { CatalogEmptyState } from "@/components/CatalogEmptyState";
import { WorkshopTable } from "@/components/WorkshopTable";
import { useProductCatalog } from "@/lib/product-catalog";
import { getProductImageSrc } from "@/lib/product-pricing";
import { apronCategories, apronProducts, getProductHref } from "@/lib/site-data";

const featureCards = [
  {
    title: "Repurposed Genuine Top-Grain Leather",
    copy: "Beautiful 100% natural top-grain leather from 40+ years of upholstery remnants outlasts other materials and gains patina with use.",
    Icon: Recycle,
  },
  {
    title: "Made for the Work",
    copy: "Pocket layouts, strap choices, and coverage are shaped around apron type, panel size, and daily movement.",
    Icon: Ruler,
  },
  {
    title: "Built by Hand",
    copy: "Each piece is cut, stitched, and finished with practical craft earned through decades of upholstery work.",
    Icon: Scissors,
  },
];

const productFilters = apronCategories.map((category) => ({
  label: category.title,
  slug: category.slug,
}));

type ProductFilterSlug = (typeof productFilters)[number]["slug"];

const easeOut = [0.22, 1, 0.36, 1] as const;

const stagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.18,
    },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: easeOut },
  },
};

const instantFadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0 } },
};

const splashFadeUp: Variants = {
  ...fadeUp,
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.25, ease: easeOut },
  },
};

const cardReveal: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.9, ease: easeOut },
  },
};

function SectionEyebrow({
  children,
  Icon,
}: {
  children: string;
  Icon: LucideIcon;
}) {
  return (
    <motion.p
      className="inline-flex items-center gap-4 text-[0.82rem] font-bold uppercase tracking-[0.24em] text-[#e7ad61] sm:text-[0.95rem]"
      variants={fadeUp}
    >
      <Icon size={30} strokeWidth={1.45} aria-hidden="true" />
      <span>{children}</span>
    </motion.p>
  );
}

function FeatureCard({
  card,
}: {
  card: { title: string; copy: string; Icon: LucideIcon };
}) {
  const { Icon } = card;

  return (
    <motion.article
      className="relative grid min-h-[15rem] grid-cols-[4rem_1fr] gap-6 overflow-hidden rounded-lg border border-white/18 bg-[#0e0906]/68 p-7 shadow-[0_22px_50px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-8"
      variants={cardReveal}
    >
      <div className="pointer-events-none absolute inset-0 bg-white/[0.04]" />
      <div className="relative z-10 flex size-14 items-center justify-center rounded-full border border-[#d6a25f] text-[#e7ad61]">
        <Icon size={30} strokeWidth={1.35} aria-hidden="true" />
      </div>
      <div className="relative z-10">
        <h2 className="font-display text-3xl font-semibold leading-[0.98] text-white sm:text-4xl">
          {card.title}
        </h2>
        <div className="mt-6 h-px w-16 bg-[#d6a25f]" />
      </div>
      <p className="relative z-10 col-span-2 text-base leading-7 text-[#e0d1bf] sm:text-lg">
        {card.copy}
      </p>
    </motion.article>
  );
}

export function HomePage() {
  const reduceMotion = useReducedMotion();
  const [apronsLanded, setApronsLanded] = useState(false);
  const handleApronsLanded = useCallback(() => setApronsLanded(true), []);
  const [activeProductFilter, setActiveProductFilter] =
    useState<ProductFilterSlug>("standard");
  const [productPageIndex, setProductPageIndex] = useState(0);
  const [productsPerView, setProductsPerView] = useState(3);
  const { products: catalogProducts } = useProductCatalog(apronProducts);
  const showSplashCopy = apronsLanded || catalogProducts.length === 0;
  const splashFade = reduceMotion ? instantFadeUp : splashFadeUp;

  useEffect(() => {
    const oneColumnQuery = window.matchMedia("(max-width: 639px)");
    const twoColumnQuery = window.matchMedia("(max-width: 1279px)");

    const updateProductsPerView = () => {
      if (oneColumnQuery.matches) {
        setProductsPerView(1);
        return;
      }

      setProductsPerView(twoColumnQuery.matches ? 2 : 3);
    };

    updateProductsPerView();
    oneColumnQuery.addEventListener("change", updateProductsPerView);
    twoColumnQuery.addEventListener("change", updateProductsPerView);

    return () => {
      oneColumnQuery.removeEventListener("change", updateProductsPerView);
      twoColumnQuery.removeEventListener("change", updateProductsPerView);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    return catalogProducts.filter(
      (product) => product.categorySlug === activeProductFilter,
    );
  }, [activeProductFilter, catalogProducts]);

  const productPageCount = useMemo(() => {
    if (filteredProducts.length === 0) {
      return 0;
    }

    return Math.ceil(filteredProducts.length / productsPerView);
  }, [filteredProducts.length, productsPerView]);

  const activeProductPageIndex =
    productPageCount === 0
      ? 0
      : Math.min(productPageIndex, productPageCount - 1);

  const visibleProducts = useMemo(() => {
    const productCount = filteredProducts.length;

    if (productCount === 0) {
      return [];
    }

    const visibleProductCount = Math.min(productsPerView, productCount);
    const startIndex = (activeProductPageIndex * productsPerView) % productCount;

    return Array.from(
      { length: visibleProductCount },
      (_, offset) => filteredProducts[(startIndex + offset) % productCount],
    );
  }, [filteredProducts, activeProductPageIndex, productsPerView]);

  const moveProducts = (direction: number) => {
    setProductPageIndex((currentPageIndex) => {
      if (productPageCount === 0) {
        return 0;
      }

      const normalizedPageIndex = Math.min(
        currentPageIndex,
        productPageCount - 1,
      );

      return (
        (normalizedPageIndex + direction + productPageCount) % productPageCount
      );
    });
  };

  return (
    <main className="bg-[#050403] text-[#f7f1e8]">
      <section className="relative flex min-h-screen flex-col justify-between overflow-hidden px-6 pb-10 pt-32 sm:px-10 sm:pt-40 lg:px-12 lg:pt-44">
        <div className="workshop-hero-main">
        <motion.div
          className="splash-hero-copy workshop-hero-copy relative z-10"
          data-workshop-copy-visible={showSplashCopy}
          inert={!showSplashCopy}
          aria-hidden={!showSplashCopy}
          variants={splashFade}
          initial="hidden"
          animate={showSplashCopy ? "visible" : "hidden"}
        >
          <motion.p
            className="splash-hero-kicker mb-5 text-[0.8rem] font-semibold uppercase tracking-[0.32em]"
          >
            Handmade Leather Aprons
          </motion.p>
          <motion.h1
            className="font-display text-5xl font-semibold leading-[0.92] tracking-[0] text-[#f8f2e9] drop-shadow-[0_8px_28px_rgba(0,0,0,0.55)] sm:text-7xl"
          >
            Where craft meets
            <span className="block text-[#e7ad61]">character.</span>
          </motion.h1>
          <motion.div
            className="mt-8 h-[3px] w-16 bg-[#d6a25f]"
          />
          <motion.p
            className="mt-7 max-w-[34rem] text-base leading-7 text-[#efe0ce] sm:text-xl sm:leading-8"
          >
            Repurposed genuine top-grain leather crossback, standard, and half aprons built
            with practical pocket layouts, durable hardware, and unique
            character.
          </motion.p>
          <motion.div
            className="workshop-hero-actions mt-9 flex flex-col gap-4 sm:flex-row sm:items-start"
          >
            <Link
              href="/custom"
              className="inline-flex min-h-16 min-w-60 items-center justify-center rounded-md bg-[linear-gradient(135deg,#efbd75,#c7802e)] px-8 text-sm font-semibold uppercase tracking-[0.18em] !text-[#050403] shadow-[0_0_28px_rgba(214,162,95,0.28)] transition duration-200 hover:-translate-y-0.5 sm:w-60 sm:shrink-0"
            >
              Custom Orders
            </Link>
            <Link
              href="/products"
              className="inline-flex min-h-16 min-w-60 items-center justify-center rounded-md border border-[#d6a25f]/80 bg-black/24 px-8 text-sm font-semibold uppercase tracking-[0.18em] text-[#e7ad61] transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a25f]/10 sm:w-60 sm:shrink-0"
            >
              Explore Aprons
            </Link>
          </motion.div>
        </motion.div>
        <WorkshopTable products={catalogProducts} onIntroComplete={handleApronsLanded} />
        </div>

        <motion.div
          className="relative z-10 mt-14 grid gap-6 xl:grid-cols-3"
          variants={stagger}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.2 }}
        >
          {featureCards.map((card) => (
            <FeatureCard card={card} key={card.title} />
          ))}
        </motion.div>
      </section>

      <section className="relative isolate overflow-hidden px-6 py-24 sm:px-10 lg:px-12 lg:py-32">
        <Image
          src="/images/story-leather-bg.png"
          alt=""
          fill
          sizes="100vw"
          className="pointer-events-none -z-10 object-cover object-center opacity-70"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,4,3,0.96)_0%,rgba(5,4,3,0.78)_44%,rgba(5,4,3,0.94)_100%)]"
          aria-hidden="true"
        />
        <motion.div
          className="mx-auto grid max-w-[112rem] gap-14 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-20"
          variants={stagger}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div variants={fadeUp}>
            <SectionEyebrow Icon={Heart}>Meet Crispin</SectionEyebrow>
            <h2 className="font-display mt-7 text-5xl font-semibold leading-[0.96] text-[#f8f2e9] sm:text-6xl lg:text-7xl">
              Four decades of craft, made by hand.
            </h2>
            <div className="my-8 h-[3px] w-16 bg-[#d6a25f]" />
            <p className="max-w-[50rem] text-lg leading-8 text-[#d8cabc] sm:text-xl">
              Upgrade Aprons is built from upholstery experience, repurposed
              genuine leather remnants, and a practical understanding of how
              useful gear should feel after years of real work.
            </p>
            <Link
              href="/about"
              className="mt-9 inline-flex min-h-14 items-center justify-center rounded-md border border-[#d6a25f]/80 px-7 text-sm font-semibold uppercase tracking-[0.18em] text-[#e7ad61] transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a25f]/10"
            >
              Read the Story
            </Link>
          </motion.div>

          <motion.div
            className="grid gap-5 sm:grid-cols-2"
            variants={stagger}
          >
            <motion.div
              className="relative aspect-[1.12] overflow-hidden rounded-lg border border-[#d6a25f]/70 shadow-[0_24px_62px_rgba(0,0,0,0.34)] sm:col-span-2"
              variants={cardReveal}
            >
              <Image
                src="/images/story-family-cropped.png"
                alt="The Upgrade Aprons team wearing handmade leather aprons."
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover object-[50%_40%]"
              />
            </motion.div>
            <motion.div
              className="relative aspect-[1.08] overflow-hidden rounded-lg border border-white/16 shadow-[0_20px_48px_rgba(0,0,0,0.3)]"
              variants={cardReveal}
            >
              <Image
                src="/images/story-market.jpg"
                alt="Upgrade Aprons market conversation."
                fill
                sizes="(min-width: 1024px) 22vw, 50vw"
                className="object-cover object-center"
              />
            </motion.div>
            <motion.div
              className="relative aspect-[1.08] overflow-hidden rounded-lg border border-white/16 shadow-[0_20px_48px_rgba(0,0,0,0.3)]"
              variants={cardReveal}
            >
              <Image
                src="/images/story-customer.jpg"
                alt="Customer holding a custom Upgrade Apron."
                fill
                sizes="(min-width: 1024px) 22vw, 50vw"
                className="object-cover object-center"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      <section className="relative isolate overflow-hidden bg-[#050403] px-6 py-24 sm:px-10 lg:px-12 lg:py-32">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_38%,rgba(43,140,134,0.13),transparent_30%),radial-gradient(circle_at_82%_22%,rgba(185,84,56,0.12),transparent_26%),linear-gradient(180deg,#050403_0%,#090604_46%,#050403_100%)]"
          aria-hidden="true"
        />
        <motion.div
          className="mx-auto max-w-[112rem]"
          variants={stagger}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.18 }}
        >
          <div className="grid gap-12 lg:grid-cols-[0.78fr_1fr] lg:items-end">
            <motion.div variants={fadeUp}>
              <SectionEyebrow Icon={Scissors}>Aprons</SectionEyebrow>
              <h2 className="font-display mt-7 text-5xl font-semibold leading-[0.96] text-[#f8f2e9] sm:text-6xl lg:text-7xl">
                Built for the way you work.
              </h2>
            </motion.div>
            <motion.div variants={fadeUp}>
              <div className="h-[3px] w-16 bg-[#d6a25f]" />
              <p className="mt-7 max-w-[48rem] text-lg leading-8 text-[#d8cabc] sm:text-xl">
                Browse crossback, standard, and half apron builds, then open a detail page
                to compare materials, pocket layouts, specs, and custom-order
                guidance.
              </p>
            </motion.div>
          </div>

          <motion.div
            className="mt-12 flex flex-wrap justify-center gap-3 lg:justify-start"
            variants={fadeUp}
            aria-label="Filter apron styles"
          >
            {productFilters.map((filter) => {
              const isActive = activeProductFilter === filter.slug;
              const productCount = catalogProducts.filter(
                (product) => product.categorySlug === filter.slug,
              ).length;

              return (
                <button
                  type="button"
                  key={filter.slug}
                  aria-pressed={isActive}
                  className={`inline-flex min-h-12 items-center gap-3 rounded-md border px-5 text-xs font-semibold uppercase tracking-[0.18em] transition duration-200 sm:px-6 ${
                    isActive
                      ? "border-[#d6a25f] bg-[#d6a25f] text-[#050403] shadow-[0_0_24px_rgba(214,162,95,0.24)]"
                      : "border-white/16 bg-black/24 text-[#e7ad61] hover:-translate-y-0.5 hover:border-[#d6a25f]/70 hover:bg-[#d6a25f]/10"
                  }`}
                  onClick={() => {
                    setActiveProductFilter(filter.slug);
                    setProductPageIndex(0);
                  }}
                >
                  <span data-site-scope={`apron-category-${filter.slug}`}>
                    {filter.label}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-[0.65rem] tracking-[0.08em] ${
                      isActive ? "bg-[#050403]/12" : "bg-white/10 text-[#d8cabc]"
                    }`}
                  >
                    <span data-site-static>{productCount}</span>
                  </span>
                </button>
              );
            })}
          </motion.div>

          <div className="mt-16 grid items-center gap-5 sm:grid-cols-[4rem_minmax(0,1fr)_4rem] lg:gap-8">
            <button
              type="button"
              aria-label="Previous apron page"
              disabled={productPageCount <= 1}
              className="hidden size-16 items-center justify-center rounded-full border border-[#d6a25f]/80 bg-black/28 text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a25f]/12 sm:inline-flex"
              onClick={() => moveProducts(-1)}
            >
              <ArrowLeft size={24} aria-hidden="true" />
            </button>

            <div
              className="flex items-center justify-between gap-3 sm:hidden"
              aria-label="Apron carousel controls"
            >
              <button
                type="button"
                aria-label="Previous apron"
                disabled={productPageCount <= 1}
                className="inline-flex size-12 items-center justify-center rounded-full border border-[#d6a25f]/80 bg-black/28 text-white transition duration-200 active:scale-95"
                onClick={() => moveProducts(-1)}
              >
                <ArrowLeft size={21} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Next apron"
                disabled={productPageCount <= 1}
                className="inline-flex size-12 items-center justify-center rounded-full border border-[#d6a25f]/80 bg-black/28 text-white transition duration-200 active:scale-95"
                onClick={() => moveProducts(1)}
              >
                <ArrowRight size={21} aria-hidden="true" />
              </button>
            </div>

            <motion.div
              className="grid gap-6 sm:col-start-2 md:grid-cols-2 xl:grid-cols-3"
              key={`${activeProductFilter}-${activeProductPageIndex}-${productsPerView}`}
              variants={stagger}
              initial={reduceMotion ? false : "hidden"}
              animate={reduceMotion ? undefined : "visible"}
            >
              {visibleProducts.length === 0 ? <CatalogEmptyState /> : null}
              {visibleProducts.map((product) => (
                <motion.article
                  key={product.slug}
                  data-product-slug={product.slug}
                  className="group flex min-h-[36rem] flex-col overflow-hidden rounded-lg border border-white/16 bg-[#0e0906]/76 shadow-[0_24px_62px_rgba(0,0,0,0.34)]"
                  variants={cardReveal}
                >
                  <ProductImageViewer
                    src={getProductImageSrc(product)}
                    alt={product.title}
                    sizes="(min-width: 1280px) 30vw, (min-width: 768px) 44vw, 100vw"
                    frameClassName="m-5 mb-0 aspect-[1.08] overflow-hidden rounded-md bg-[radial-gradient(circle_at_50%_35%,rgba(214,162,95,0.14),transparent_58%),linear-gradient(145deg,#18110d,#070504)]"
                    imageClassName="object-contain object-center p-5 opacity-90 transition duration-700 group-hover:scale-[1.035] group-hover:opacity-100"
                  />
                  <div className="relative z-10 flex flex-1 flex-col justify-end p-7 sm:p-8">
                    <p
                      className="text-xs font-bold uppercase tracking-[0.2em]"
                      style={{ color: product.accent }}
                    >
                      <span data-product-field="category">{product.category}</span>
                    </p>
                    <h3 className="font-display mt-4 text-4xl font-semibold leading-none text-white">
                      <span data-product-field="title">{product.title}</span>
                    </h3>
                    <div
                      className="my-6 h-px w-14"
                      style={{ backgroundColor: product.accent }}
                    />
                    <p className="text-base leading-7 text-[#e4d5c5]">
                      <span data-product-field="intro">{product.intro}</span>
                    </p>
                    <ProductPrice product={product} className="mt-6" />
                    <Link
                      href={getProductHref(product)}
                      className="mt-7 inline-flex text-sm font-semibold uppercase tracking-[0.18em] text-[#e7ad61] transition hover:text-white"
                    >
                      View Details
                    </Link>
                  </div>
                </motion.article>
              ))}
            </motion.div>

            <button
              type="button"
              aria-label="Next apron page"
              disabled={productPageCount <= 1}
              className="hidden size-16 items-center justify-center rounded-full border border-[#d6a25f]/80 bg-black/28 text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a25f]/12 sm:inline-flex"
              onClick={() => moveProducts(1)}
            >
              <ArrowRight size={24} aria-hidden="true" />
            </button>
          </div>

          <div className="mt-8 flex justify-center gap-3" aria-label="Apron carousel position">
            {Array.from({ length: productPageCount }).map((_, index) => (
              <button
                type="button"
                key={`${activeProductFilter}-page-${index + 1}`}
                aria-label={`Show apron page ${index + 1}`}
                aria-current={activeProductPageIndex === index ? "page" : undefined}
                className={`size-3 rounded-full transition duration-200 ${
                  activeProductPageIndex === index
                    ? "bg-[#d6a25f] shadow-[0_0_18px_rgba(214,162,95,0.42)]"
                    : "bg-white/24 hover:bg-[#d6a25f]/70"
                }`}
                onClick={() => setProductPageIndex(index)}
              />
            ))}
          </div>

          <motion.div className="mt-12 text-center" variants={fadeUp}>
            <Link
              href="/products"
              className="inline-flex min-h-14 items-center justify-center rounded-md bg-[linear-gradient(135deg,#efbd75,#c7802e)] px-8 text-sm font-semibold uppercase tracking-[0.18em] !text-[#050403] shadow-[0_0_28px_rgba(214,162,95,0.24)] transition duration-200 hover:-translate-y-0.5"
            >
              Explore All Aprons
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <section className="relative isolate overflow-hidden px-6 py-24 sm:px-10 lg:px-12 lg:py-32">
        <Image
          src="/images/story-leather-bg.png"
          alt=""
          fill
          sizes="100vw"
          className="pointer-events-none -z-10 object-cover object-center opacity-60"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,4,3,0.98)_0%,rgba(5,4,3,0.72)_54%,rgba(5,4,3,0.94)_100%)]"
          aria-hidden="true"
        />
        <motion.div
          className="mx-auto grid max-w-[100rem] gap-10 rounded-lg border border-white/16 bg-[#0e0906]/66 p-8 shadow-[0_28px_70px_rgba(0,0,0,0.3)] backdrop-blur-md sm:p-12 lg:grid-cols-[1fr_0.8fr] lg:p-16"
          variants={stagger}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.2 }}
        >
          <div>
            <SectionEyebrow Icon={Sparkles}>Markets + Notes</SectionEyebrow>
            <h2 className="font-display mt-7 text-5xl font-semibold leading-[0.96] text-white sm:text-6xl">
              See the work in context.
            </h2>
          </div>
          <div className="self-end">
            <motion.p
              className="text-lg leading-8 text-[#d8cabc] sm:text-xl"
              variants={fadeUp}
            >
              Market days, customer conversations, and custom builds shape the
              next pieces. The events page collects the brand notes and practical
              details behind the work.
            </motion.p>
            <Link
              href="/events"
              className="mt-9 inline-flex min-h-14 items-center justify-center rounded-md border border-[#d6a25f]/80 px-7 text-sm font-semibold uppercase tracking-[0.18em] text-[#e7ad61] transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a25f]/10"
            >
              View Events
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  );
}

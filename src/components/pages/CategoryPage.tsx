"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Hammer, Ruler, Scissors, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ProductImageViewer } from "@/components/ProductImageViewer";
import { ProductPrice } from "@/components/ProductPrice";
import { ProductDetailsLink } from "@/components/ProductDetailsLink";
import { CatalogEmptyState } from "@/components/CatalogEmptyState";
import { useProductCatalog } from "@/lib/product-catalog";
import { getProductImageSrc } from "@/lib/product-pricing";
import type { ApronCategory, ApronProduct } from "@/lib/site-data";
import { StandardSizeFilter, type SizeFilter } from "@/components/StandardSizeFilter";
import { getStandardSizeLabel } from "@/lib/product-sizing";

const easeOut = [0.22, 1, 0.36, 1] as const;

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.16 } },
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

export function CategoryPage({
  category,
  products,
}: {
  category: ApronCategory;
  products: ApronProduct[];
}) {
  const reduceMotion = useReducedMotion();
  const { products: catalogProducts } = useProductCatalog(products);
  const [size, setSize] = useState<SizeFilter>("all");
  const visibleProducts = category.slug === "standard" && size !== "all"
    ? catalogProducts.filter(product => product.standardSize === size)
    : catalogProducts;
  const Icon =
    category.slug === "half-apron"
      ? Scissors
      : category.slug === "standard"
        ? Ruler
        : Hammer;

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#050403] px-6 pb-24 pt-36 text-[#f7f1e8] sm:px-10 sm:pt-40 lg:px-12 lg:pb-32 lg:pt-44">
      <Image
        src={category.image}
        alt=""
        fill
        priority
        sizes="100vw"
        className="pointer-events-none -z-10 object-contain object-[82%_18%] p-10 opacity-25"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,4,3,0.98)_0%,rgba(5,4,3,0.78)_48%,rgba(5,4,3,0.96)_100%)]"
        aria-hidden="true"
      />

      <motion.div
        className="mx-auto max-w-[112rem]"
        variants={stagger}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <Link
            href="/products"
            className="inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#e7ad61] transition hover:text-white"
          >
            <ArrowLeft size={20} aria-hidden="true" />
            All Aprons
          </Link>
        </motion.div>

        <section className="mt-10 grid gap-12 lg:grid-cols-[0.8fr_1fr] lg:items-end">
          <motion.div variants={fadeUp}>
            <SectionEyebrow Icon={Icon}>{category.eyebrow}</SectionEyebrow>
            <h1 className="font-display mt-7 text-6xl font-semibold leading-[0.92] text-[#f8f2e9] sm:text-7xl lg:text-8xl">
              {category.title}
            </h1>
          </motion.div>
          <motion.div variants={fadeUp}>
            <div
              className="h-[3px] w-16"
              style={{ backgroundColor: category.accent }}
            />
            <p className="mt-7 max-w-[48rem] text-lg leading-8 text-[#d8cabc] sm:text-xl">
              {category.description}
            </p>
          </motion.div>
        </section>

        {category.slug === "standard" && <StandardSizeFilter products={catalogProducts} value={size} onChange={setSize} />}
        {category.slug === "custom" && <Link href="/custom" className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-md bg-[#d6a25f] px-5 py-3 text-sm font-semibold !text-[#050403] hover:bg-[#efbd75]">Start your custom design</Link>}

        <motion.section
          className="mt-16 grid gap-6 md:grid-cols-2"
          variants={stagger}
        >
          {catalogProducts.length === 0 ? <CatalogEmptyState /> : null}
          {catalogProducts.length > 0 && visibleProducts.length === 0 ? <p role="status" className="text-[#d8cabc]">No aprons have a confirmed {size} size yet. Browse All sizes or contact us for fit advice.</p> : null}
          {visibleProducts.map((product) => (
            <motion.article
              className="group grid overflow-hidden rounded-lg border border-white/16 bg-[#0e0906]/78 shadow-[0_24px_62px_rgba(0,0,0,0.34)] backdrop-blur-md lg:grid-cols-[0.92fr_1fr]"
              data-product-slug={product.slug}
              key={product.slug}
              variants={cardReveal}
            >
              <ProductImageViewer
                sold={product.sold}
                src={getProductImageSrc(product)}
                alt={product.title}
                sizes="(min-width: 1024px) 30vw, 100vw"
                frameClassName="min-h-[23rem] overflow-hidden bg-[radial-gradient(circle_at_50%_36%,rgba(214,162,95,0.14),transparent_58%),linear-gradient(145deg,#18110d,#070504)]"
                imageClassName="object-contain object-center p-6 transition duration-700 group-hover:scale-[1.035]"
              />
              <div className="flex flex-col p-7 sm:p-9">
                <p
                  className="text-xs font-bold uppercase tracking-[0.2em]"
                  style={{ color: product.accent }}
                >
                  <span data-product-field="eyebrow">{product.eyebrow}</span>
                </p>
                <h2 className="font-display mt-4 text-4xl font-semibold leading-none text-white">
                  <span data-product-field="title">{product.title}</span>
                </h2>
                <div
                  className="my-6 h-px w-14"
                  style={{ backgroundColor: product.accent }}
                />
                <p className="text-base leading-7 text-[#d8cabc]">
                  <span data-product-field="description">{product.description}</span>
                </p>
                <ProductPrice product={product} className="mt-6" />
                {category.slug === "standard" && <p data-site-static className="mt-3 text-sm text-[#d8cabc]">{getStandardSizeLabel(product)}</p>}
                <ProductDetailsLink product={product} />
              </div>
            </motion.article>
          ))}
        </motion.section>
      </motion.div>
    </main>
  );
}

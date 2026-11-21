"use client";

import Image from "next/image";
import Link from "next/link";
import { SoldBadge } from "@/components/SoldBadge";
import { useEffect, useRef, useState } from "react";
import { getProductHref, type ApronProduct } from "@/lib/site-data";
import { getProductImageSrc } from "@/lib/product-pricing";
import { selectWorkshopProducts } from "@/lib/workshop-selection";
import { takePreloadedWorkshopProducts, workshopSelectionKey } from "@/lib/workshop-preload";

export function WorkshopTable({ products, onIntroComplete }: {
  products: ApronProduct[];
  onIntroComplete?: () => void;
}) {
  const [slugs, setSlugs] = useState<string[] | null>(null);
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const skipIntro = () => {
      if (preference.matches) onIntroComplete?.();
    };
    skipIntro();
    preference.addEventListener("change", skipIntro);
    return () => preference.removeEventListener("change", skipIntro);
  }, [onIntroComplete]);

  useEffect(() => {
    if (initialized.current || !products.length) return;
    // Reuse the head's preloaded selection; client navigation still selects afresh.
    const frame = requestAnimationFrame(() => {
      initialized.current = true;
      let previous: Record<string, string> = {};
      try {
        const stored: unknown = JSON.parse(sessionStorage.getItem(workshopSelectionKey) || "{}");
        if (stored && typeof stored === "object" && !Array.isArray(stored)) {
          previous = stored as Record<string, string>;
        }
      } catch {
        // Random selection still works when browser storage is unavailable.
      }
      const selected = takePreloadedWorkshopProducts(products) || selectWorkshopProducts(products, previous);
      try {
        sessionStorage.setItem(workshopSelectionKey, JSON.stringify(Object.fromEntries(
          selected.map((product) => [product.categorySlug, product.slug]),
        )));
      } catch {
        // Saving the previous selection is optional in private browsing.
      }
      setSlugs(selected.map((product) => product.slug));
    });
    return () => cancelAnimationFrame(frame);
  }, [products]);

  const selected = (slugs || []).flatMap((slug) => {
    const product = products.find((item) => item.slug === slug);
    return product ? [product] : [];
  });
  const imagesReady = selected.length > 0 && selected.every((product) => loadedImages.includes(getProductImageSrc(product)));
  const finalCategory = ["half-apron", "standard", "crossback"].find((category) => selected.some((product) => product.categorySlug === category));
  const settleImage = (src: string) => setLoadedImages((current) => current.includes(src) ? current : [...current, src]);
  const markImageReady = async (image: HTMLImageElement, src: string) => {
    try {
      await image.decode();
      if (!image.isConnected) return;
      settleImage(src);
    } catch {
      // A failed photo must not block the rest of the page.
      settleImage(src);
    }
  };

  return (
    <div className="workshop-scene" data-workshop-scene data-site-scope="workshop-table">
      <Image
        src="/images/workshop-table-scaled-tools-v6.png"
        alt="Leather-covered craftsman's workbench with tools set along the far top rim"
        fill
        loading="eager"
        fetchPriority="high"
        sizes="100vw"
        className="workshop-table-background object-cover"
      />
      <div className="workshop-table-shade" aria-hidden="true" />
      <div className="workshop-aprons" data-workshop-ready={imagesReady}>
        {selected.map((product) => (
          <Link
            key={product.slug}
            href={getProductHref(product)}
            aria-label={`View ${product.title}${product.sold ? ", sold" : ""}`}
            className={`workshop-apron workshop-apron-${product.categorySlug}`}
            data-workshop-slot={product.categorySlug}
            data-product-slug={product.slug}
          >
            <Image
              src={getProductImageSrc(product)}
              alt={product.title}
              fill
              unoptimized
              loading="eager"
              fetchPriority="high"
              sizes="(min-width: 1024px) 28vw, 45vw"
              className="workshop-apron-image object-contain"
              onLoad={(event) => void markImageReady(event.currentTarget, getProductImageSrc(product))}
              onError={() => settleImage(getProductImageSrc(product))}
              onAnimationEnd={(event) => {
                if (event.animationName === "workshop-apron-fade" && product.categorySlug === finalCategory) onIntroComplete?.();
              }}
            />
            {product.sold ? <SoldBadge className="!left-1/2 !top-1/2 -translate-x-1/2" /> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

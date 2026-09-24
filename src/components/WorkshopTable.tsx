"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getProductHref, type ApronProduct } from "@/lib/site-data";
import { getProductImageSrc } from "@/lib/product-pricing";
import { selectWorkshopProducts } from "@/lib/workshop-selection";

const selectionKey = "upgrade-aprons-workshop-selection";

export function WorkshopTable({ products, onIntroComplete }: {
  products: ApronProduct[];
  onIntroComplete?: () => void;
}) {
  const [slugs, setSlugs] = useState<string[] | null>(null);
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const revealWithoutAnimation = () => {
      if (preference.matches) onIntroComplete?.();
    };
    revealWithoutAnimation();
    preference.addEventListener("change", revealWithoutAnimation);
    return () => preference.removeEventListener("change", revealWithoutAnimation);
  }, [onIntroComplete]);

  useEffect(() => {
    if (initialized.current || !products.length) return;
    // Select after hydration; session storage and randomness are browser-only.
    const frame = requestAnimationFrame(() => {
      initialized.current = true;
      let previous: Record<string, string> = {};
      try {
        const stored: unknown = JSON.parse(sessionStorage.getItem(selectionKey) || "{}");
        if (stored && typeof stored === "object" && !Array.isArray(stored)) {
          previous = stored as Record<string, string>;
        }
      } catch {
        // Random selection still works when browser storage is unavailable.
      }
      const selected = selectWorkshopProducts(products, previous);
      try {
        sessionStorage.setItem(selectionKey, JSON.stringify(Object.fromEntries(
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
  const markImageReady = (src: string) => {
    setLoadedImages((current) => current.includes(src) ? current : [...current, src]);
  };

  return (
    <div className="workshop-scene" data-workshop-scene data-site-scope="workshop-table">
      <Image
        src="/images/workshop-table-scaled-tools-v6.png"
        alt="Leather-covered craftsman's workbench with tools set along the far top rim"
        fill
        priority
        sizes="100vw"
        className="workshop-table-background object-cover"
      />
      <div className="workshop-table-shade" aria-hidden="true" />
      <div className="workshop-aprons" data-workshop-ready={imagesReady}>
        {selected.map((product) => (
          <Link
            key={product.slug}
            href={getProductHref(product)}
            aria-label={`View ${product.title}`}
            className={`workshop-apron workshop-apron-${product.categorySlug}`}
            data-workshop-slot={product.categorySlug}
            data-product-slug={product.slug}
          >
            <Image
              src={getProductImageSrc(product)}
              alt={product.title}
              fill
              unoptimized
              priority
              sizes="(min-width: 1024px) 28vw, 45vw"
              className="workshop-apron-image object-contain"
              onLoad={() => markImageReady(getProductImageSrc(product))}
              onError={() => markImageReady(getProductImageSrc(product))}
              onAnimationEnd={(event) => {
                if (event.animationName === "workshop-apron-drop" && product.categorySlug === finalCategory) {
                  onIntroComplete?.();
                }
              }}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { getFirebaseFirestore } from "@/lib/firebase";
import { getProductBasePrice } from "@/lib/product-pricing";
import type { ApronProduct } from "@/lib/site-data";

export const PRODUCT_COLLECTION = "products";
export const OWNER_EMAIL = "upgrade@whidbey.com";

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function numberValue(value: unknown, fallback: number) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function stringArrayValue(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const strings = value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);

  return strings.length ? strings : fallback;
}

function materialValue(value: unknown, fallback: string) {
  const material = stringValue(value, fallback);

  return material.trim().toLowerCase() === "repurposed leather"
    ? fallback
    : material;
}

function specsValue(
  value: unknown,
  fallback: ApronProduct["specs"],
): ApronProduct["specs"] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const specs = value
    .map((item) =>
      item && typeof item === "object"
        ? {
            label: String((item as { label?: unknown }).label ?? "").trim(),
            value: String((item as { value?: unknown }).value ?? "").trim(),
          }
        : null,
    )
    .filter(
      (item): item is { label: string; value: string } =>
        Boolean(item?.label && item.value),
    );

  return specs.length ? specs : fallback;
}

export function isOwnerEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase() === OWNER_EMAIL;
}

export function normalizeProductRecord(
  baseProduct: ApronProduct,
  record: Partial<ApronProduct> | null | undefined,
): ApronProduct {
  if (!record) {
    return {
      ...baseProduct,
      basePrice: getProductBasePrice(baseProduct),
      limitedEdition: Boolean(baseProduct.limitedEdition),
    };
  }

  const merged = {
    ...baseProduct,
    slug: baseProduct.slug,
    categorySlug: baseProduct.categorySlug,
    title: stringValue(record.title, baseProduct.title),
    category: stringValue(record.category, baseProduct.category),
    eyebrow: stringValue(record.eyebrow, baseProduct.eyebrow),
    intro: stringValue(record.intro, baseProduct.intro),
    description: stringValue(record.description, baseProduct.description),
    image: stringValue(record.image, baseProduct.image),
    ...(Array.isArray(record.alternateImages)
      ? { alternateImages: record.alternateImages.filter((image): image is string => typeof image === "string" && Boolean(image.trim())) }
      : {}),
    imageUrl: stringValue(record.imageUrl, baseProduct.imageUrl ?? ""),
    imageStoragePath: stringValue(
      record.imageStoragePath,
      baseProduct.imageStoragePath ?? "",
    ),
    accent: stringValue(record.accent, baseProduct.accent),
    material: materialValue(record.material, baseProduct.material),
    finish: stringValue(record.finish, baseProduct.finish),
    priceNote: stringValue(record.priceNote, baseProduct.priceNote),
    details: stringArrayValue(record.details, baseProduct.details),
    specs: specsValue(record.specs, baseProduct.specs),
    layoutTags: stringArrayValue(record.layoutTags, baseProduct.layoutTags),
    limitedEdition: booleanValue(
      record.limitedEdition,
      Boolean(baseProduct.limitedEdition),
    ),
  };

  return {
    ...merged,
    basePrice: numberValue(record.basePrice, getProductBasePrice(merged)),
  };
}

export function mergeProductCatalog(
  baseProducts: ApronProduct[],
  remoteProducts: Partial<ApronProduct>[],
) {
  const recordsBySlug = new Map(
    remoteProducts
      .filter((product) => product.slug)
      .map((product) => [product.slug, product]),
  );

  return baseProducts.map((product) =>
    normalizeProductRecord(product, recordsBySlug.get(product.slug)),
  );
}

export function buildProductSeedRecord(product: ApronProduct) {
  return {
    ...product,
    basePrice: getProductBasePrice(product),
    limitedEdition: Boolean(product.limitedEdition),
  };
}

export function useProductCatalog(baseProducts: ApronProduct[]) {
  const stableBaseProducts = useMemo(() => baseProducts, [baseProducts]);
  const [remoteProducts, setRemoteProducts] = useState<Partial<ApronProduct>[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isMounted = true;

    getFirebaseFirestore()
      .then(async (db) => {
        if (!db || !isMounted) {
          setIsLoading(false);
          return;
        }

        const { collection, onSnapshot } = await import("firebase/firestore");

        unsubscribe = onSnapshot(
          collection(db, PRODUCT_COLLECTION),
          (snapshot) => {
            if (!isMounted) {
              return;
            }

            setRemoteProducts(
              snapshot.docs.map((document) => ({
                slug: document.id,
                ...document.data(),
              })),
            );
            setError("");
            setIsLoading(false);
          },
          (snapshotError) => {
            console.warn("Product catalog could not be loaded.", snapshotError);
            if (isMounted) {
              setError("Products could not be loaded from Firebase.");
              setIsLoading(false);
            }
          },
        );
      })
      .catch((loadError) => {
        console.warn("Product catalog could not be initialized.", loadError);
        if (isMounted) {
          setError("Products could not be loaded from Firebase.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [stableBaseProducts]);

  const products = useMemo(
    () => mergeProductCatalog(stableBaseProducts, remoteProducts),
    [stableBaseProducts, remoteProducts],
  );

  return {
    products,
    isLoading,
    error,
  };
}

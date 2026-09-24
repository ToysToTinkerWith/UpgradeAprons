"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  LoaderCircle,
  LogOut,
  Pencil,
  Save,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { ProductPrice } from "@/components/ProductPrice";
import {
  getFirebaseAuth,
  getFirebaseFirestore,
  getFirebaseStorage,
} from "@/lib/firebase";
import {
  PRODUCT_COLLECTION,
  buildProductSeedRecord,
  isOwnerEmail,
  useProductCatalog,
} from "@/lib/product-catalog";
import { getProductBasePrice, getProductImageSrc } from "@/lib/product-pricing";
import type { ApronProduct } from "@/lib/site-data";
import { apronCategories, apronProducts, getProductHref } from "@/lib/site-data";

type DashboardDraft = {
  title: string;
  category: string;
  eyebrow: string;
  intro: string;
  description: string;
  material: string;
  finish: string;
  priceNote: string;
  detailsText: string;
  specsText: string;
  layoutTagsText: string;
  limitedEdition: boolean;
  imageUrl: string;
  imageStoragePath: string;
  isDirty: boolean;
};

type OwnerUser = {
  email: string | null;
};

const ALL_PRODUCTS_FILTER = "all";

const fieldLabelClass =
  "grid min-w-0 gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#e7ad61]";

const fieldControlClass =
  "min-h-12 w-full min-w-0 rounded-md border border-white/14 bg-black/28 px-4 text-base font-normal normal-case tracking-[0] text-white outline-none transition focus:border-[#d6a25f]";

const textareaClass =
  "min-h-28 w-full min-w-0 rounded-md border border-white/14 bg-black/28 px-4 py-3 text-base font-normal normal-case tracking-[0] text-white outline-none transition focus:border-[#d6a25f]";

function createDraft(product: ApronProduct): DashboardDraft {
  return {
    title: product.title,
    category: product.category,
    eyebrow: product.eyebrow,
    intro: product.intro,
    description: product.description,
    material: product.material,
    finish: product.finish,
    priceNote: product.priceNote,
    detailsText: product.details.join("\n"),
    specsText: product.specs
      .map((spec) => `${spec.label}: ${spec.value}`)
      .join("\n"),
    layoutTagsText: product.layoutTags.join(", "),
    limitedEdition: Boolean(product.limitedEdition),
    imageUrl: product.imageUrl ?? "",
    imageStoragePath: product.imageStoragePath ?? "",
    isDirty: false,
  };
}

function parseLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseSpecs(value: string, fallback: ApronProduct["specs"]) {
  const specs = value
    .split("\n")
    .map((line) => {
      const [label, ...rest] = line.split(":");

      return {
        label: label?.trim() ?? "",
        value: rest.join(":").trim(),
      };
    })
    .filter((spec) => spec.label && spec.value);

  return specs.length ? specs : fallback;
}

function draftToProduct(product: ApronProduct, draft: DashboardDraft) {
  return {
    ...product,
    title: draft.title.trim() || product.title,
    category: draft.category.trim() || product.category,
    eyebrow: draft.eyebrow.trim() || product.eyebrow,
    intro: draft.intro.trim() || product.intro,
    description: draft.description.trim() || product.description,
    material: draft.material.trim() || product.material,
    finish: draft.finish.trim() || product.finish,
    priceNote: draft.priceNote.trim() || product.priceNote,
    details: parseLines(draft.detailsText),
    specs: parseSpecs(draft.specsText, product.specs),
    layoutTags: draft.layoutTagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    basePrice: getProductBasePrice(product),
    limitedEdition: draft.limitedEdition,
    imageUrl: draft.imageUrl.trim(),
    imageStoragePath: draft.imageStoragePath.trim(),
  };
}

function getPublicAssetUrl(path: string) {
  if (typeof window === "undefined") {
    return path;
  }

  return new URL(path, window.location.origin).toString();
}

function getStorageImagePath(product: ApronProduct, filename: string) {
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]+/g, "-");

  return `product-images/${product.slug}/${safeFilename || "product-image"}`;
}

async function uploadProductImageFromUrl(product: ApronProduct, imagePath: string) {
  const storage = await getFirebaseStorage();

  if (!storage) {
    throw new Error("Firebase Storage is unavailable.");
  }

  const { getDownloadURL, ref, uploadBytes } = await import("firebase/storage");
  const imageUrl = getPublicAssetUrl(imagePath);
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Could not load ${product.title} image.`);
  }

  const blob = await response.blob();
  const filename = imagePath.split("/").pop() || `${product.slug}.png`;
  const storagePath = getStorageImagePath(product, filename);
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, blob, {
    contentType: blob.type || "image/png",
  });

  return {
    imageUrl: await getDownloadURL(storageRef),
    imageStoragePath: storagePath,
  };
}

async function uploadProductImageFile(product: ApronProduct, file: File) {
  const storage = await getFirebaseStorage();

  if (!storage) {
    throw new Error("Firebase Storage is unavailable.");
  }

  const { getDownloadURL, ref, uploadBytes } = await import("firebase/storage");
  const storagePath = getStorageImagePath(product, file.name);
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, {
    contentType: file.type || "image/png",
  });

  return {
    imageUrl: await getDownloadURL(storageRef),
    imageStoragePath: storagePath,
  };
}

export function OwnerDashboardPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [ownerUser, setOwnerUser] = useState<OwnerUser | null>(null);
  const { products, isLoading: productsLoading, error } =
    useProductCatalog(apronProducts);
  const [drafts, setDrafts] = useState<Record<string, DashboardDraft>>({});
  const [statusBySlug, setStatusBySlug] = useState<Record<string, string>>({});
  const [syncStatus, setSyncStatus] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] =
    useState(ALL_PRODUCTS_FILTER);
  const [expandedProductSlug, setExpandedProductSlug] = useState<string | null>(
    null,
  );
  const productCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const pendingProductPositionRef = useRef<{
    slug: string;
    top: number;
  } | null>(null);

  const isOwner = isOwnerEmail(ownerUser?.email);

  useLayoutEffect(() => {
    const pendingPosition = pendingProductPositionRef.current;

    if (!pendingPosition) {
      return;
    }

    pendingProductPositionRef.current = null;

    const productCard = productCardRefs.current[pendingPosition.slug];

    if (!productCard) {
      return;
    }

    const nextTop = productCard.getBoundingClientRect().top;
    const scrollDelta = nextTop - pendingPosition.top;

    if (Math.abs(scrollDelta) > 1) {
      window.scrollBy({ top: scrollDelta, left: 0, behavior: "auto" });
    }
  }, [expandedProductSlug]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    getFirebaseAuth()
      .then(async (auth) => {
        if (!auth) {
          setAuthLoading(false);
          return;
        }

        const { onAuthStateChanged } = await import("firebase/auth");

        unsubscribe = onAuthStateChanged(auth, (user) => {
          setOwnerUser(user ? { email: user.email } : null);
          setAuthLoading(false);
        });
      })
      .catch((loadError) => {
        console.warn("Owner dashboard auth could not initialize.", loadError);
        setAuthLoading(false);
      });

    return () => unsubscribe?.();
  }, []);

  const updatedProducts = useMemo(
    () =>
      products.map((product) => {
        const draft = drafts[product.slug];

        return draft ? draftToProduct(product, draft) : product;
      }),
    [products, drafts],
  );

  const filteredProducts = useMemo(() => {
    if (activeCategoryFilter === ALL_PRODUCTS_FILTER) {
      return updatedProducts;
    }

    return updatedProducts.filter(
      (product) => product.categorySlug === activeCategoryFilter,
    );
  }, [activeCategoryFilter, updatedProducts]);

  const updateDraft = (product: ApronProduct, patch: Partial<DashboardDraft>) => {
    setDrafts((current) => ({
      ...current,
      [product.slug]: {
        ...(current[product.slug] ?? createDraft(product)),
        ...patch,
        isDirty: true,
      },
    }));
    setStatusBySlug((current) => ({ ...current, [product.slug]: "" }));
  };

  const toggleProductEditor = (productSlug: string) => {
    const productCard = productCardRefs.current[productSlug];

    pendingProductPositionRef.current =
      expandedProductSlug !== productSlug && productCard
        ? {
            slug: productSlug,
            top: productCard.getBoundingClientRect().top,
          }
        : null;

    setExpandedProductSlug((current) =>
      current === productSlug ? null : productSlug,
    );
  };

  const saveProduct = async (product: ApronProduct) => {
    const draft = drafts[product.slug];

    if (!draft) {
      return;
    }

    setStatusBySlug((current) => ({ ...current, [product.slug]: "Saving" }));

    try {
      const db = await getFirebaseFirestore();

      if (!db) {
        throw new Error("Firebase Firestore is unavailable.");
      }

      const { doc, serverTimestamp, setDoc } = await import("firebase/firestore");
      const record = draftToProduct(product, draft);

      await setDoc(
        doc(db, PRODUCT_COLLECTION, product.slug),
        {
          ...record,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setDrafts((current) => {
        const next = { ...current };
        delete next[product.slug];

        return next;
      });
      setStatusBySlug((current) => ({ ...current, [product.slug]: "Saved" }));
    } catch (saveError) {
      console.warn("Product could not be saved.", saveError);
      setStatusBySlug((current) => ({
        ...current,
        [product.slug]: "Could not save",
      }));
    }
  };

  const handleProductSubmit = (
    event: FormEvent<HTMLFormElement>,
    product: ApronProduct,
  ) => {
    event.preventDefault();
    void saveProduct(product);
  };

  const handleImageFileChange = async (
    product: ApronProduct,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setStatusBySlug((current) => ({
      ...current,
      [product.slug]: "Uploading image",
    }));

    try {
      const uploaded = await uploadProductImageFile(product, file);
      updateDraft(product, uploaded);
      setStatusBySlug((current) => ({
        ...current,
        [product.slug]: "Image uploaded. Save this product to keep it.",
      }));
    } catch (uploadError) {
      console.warn("Product image could not be uploaded.", uploadError);
      setStatusBySlug((current) => ({
        ...current,
        [product.slug]: "Could not upload image",
      }));
    } finally {
      event.target.value = "";
    }
  };

  const syncInitialProducts = async () => {
    setIsSyncing(true);
    setSyncStatus("Uploading products to Firebase...");

    try {
      const db = await getFirebaseFirestore();

      if (!db) {
        throw new Error("Firebase Firestore is unavailable.");
      }

      const { doc, serverTimestamp, setDoc } = await import("firebase/firestore");

      let imageUploadFailures = 0;

      for (const product of apronProducts) {
        setSyncStatus(`Uploading ${product.title}...`);
        let uploaded:
          | { imageUrl: string; imageStoragePath: string }
          | undefined;

        try {
          uploaded = await uploadProductImageFromUrl(product, product.image);
        } catch (imageUploadError) {
          imageUploadFailures += 1;
          console.warn(
            `${product.title} image could not be uploaded.`,
            imageUploadError,
          );
        }

        await setDoc(
          doc(db, PRODUCT_COLLECTION, product.slug),
          {
            ...buildProductSeedRecord(product),
            ...(uploaded ?? {}),
            seededAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      setSyncStatus(
        imageUploadFailures
          ? "Products were uploaded. Firebase Storage setup is still needed for product images."
          : "All products and images were uploaded to Firebase.",
      );
    } catch (syncError) {
      console.warn("Products could not be uploaded to Firebase.", syncError);
      setSyncStatus("The product upload did not finish. Check Firebase access.");
    } finally {
      setIsSyncing(false);
    }
  };

  const signOut = async () => {
    const auth = await getFirebaseAuth();

    if (!auth) {
      return;
    }

    const { signOut: firebaseSignOut } = await import("firebase/auth");
    await firebaseSignOut(auth);
  };

  if (authLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050403] px-6 text-[#f7f1e8]">
        <div className="inline-flex items-center gap-3 text-[#e7ad61]">
          <LoaderCircle className="animate-spin" size={22} aria-hidden="true" />
          <span className="text-sm font-semibold uppercase tracking-[0.18em]">
            Checking dashboard access
          </span>
        </div>
      </main>
    );
  }

  if (!ownerUser) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050403] px-6 text-center text-[#f7f1e8]">
        <div className="max-w-xl">
          <h1 className="font-display text-5xl font-semibold text-white">
            Owner login required.
          </h1>
          <p className="mt-5 text-base leading-7 text-[#d8cabc]">
            Sign in with the Upgrade Aprons owner account to manage products.
          </p>
          <Link
            className="mt-8 inline-flex min-h-14 items-center justify-center rounded-md bg-[linear-gradient(135deg,#efbd75,#c7802e)] px-7 text-sm font-semibold uppercase tracking-[0.18em] !text-[#050403]"
            href="/login"
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  if (!isOwner) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050403] px-6 text-center text-[#f7f1e8]">
        <div className="max-w-xl">
          <h1 className="font-display text-5xl font-semibold text-white">
            Not authorized.
          </h1>
          <p className="mt-5 text-base leading-7 text-[#d8cabc]">
            This dashboard is only available to the Upgrade Aprons owner
            account.
          </p>
          <button
            className="mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-md border border-[#d6a25f]/70 px-7 text-sm font-semibold uppercase tracking-[0.18em] text-[#e7ad61]"
            onClick={signOut}
            type="button"
          >
            <LogOut size={18} aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#050403] px-6 pb-24 pt-36 text-[#f7f1e8] sm:px-10 sm:pt-40 lg:px-12 lg:pb-32 lg:pt-44">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_20%,rgba(214,162,95,0.15),transparent_30%),radial-gradient(circle_at_18%_86%,rgba(43,140,134,0.12),transparent_30%),linear-gradient(180deg,#050403_0%,#090604_48%,#050403_100%)]"
      />

      <section className="mx-auto max-w-[116rem]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-4 text-[0.82rem] font-bold uppercase tracking-[0.24em] text-[#e7ad61] sm:text-[0.95rem]">
              <ShieldCheck size={30} strokeWidth={1.45} aria-hidden="true" />
              <span>Owner Dashboard</span>
            </p>
            <h1 className="font-display mt-7 text-6xl font-semibold leading-[0.92] text-[#f8f2e9] sm:text-7xl lg:text-8xl">
              Product manager.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-7 text-[#d8cabc] sm:text-lg">
              Edit the product information shown on the site. Limited edition
              products display a 25% price increase over the base category
              price.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[32rem]">
            <button
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-md bg-[linear-gradient(135deg,#efbd75,#c7802e)] px-5 text-xs font-semibold uppercase tracking-[0.16em] !text-[#050403] shadow-[0_0_28px_rgba(214,162,95,0.22)] transition duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
              disabled={isSyncing}
              onClick={syncInitialProducts}
              type="button"
            >
              <UploadCloud size={18} aria-hidden="true" />
              {isSyncing ? "Uploading" : "Upload All to Firebase"}
            </button>
            <button
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-md border border-[#d6a25f]/70 px-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#e7ad61] transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a25f]/10 hover:text-white"
              onClick={signOut}
              type="button"
            >
              <LogOut size={18} aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="mt-6 min-h-6">
          {syncStatus ? (
            <p className="text-sm font-semibold text-[#e7ad61]" aria-live="polite">
              {syncStatus}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm font-semibold text-[#f0a6a6]">{error}</p>
          ) : null}
        </div>

        <div className="mt-10 rounded-lg border border-white/14 bg-[#0e0906]/64 p-4 shadow-[0_20px_48px_rgba(0,0,0,0.22)] backdrop-blur-md sm:p-5">
          <div className="flex flex-wrap gap-3" aria-label="Filter products">
            {[
              {
                slug: ALL_PRODUCTS_FILTER,
                label: "All Products",
                count: updatedProducts.length,
              },
              ...apronCategories.map((category) => ({
                slug: category.slug,
                label: category.title,
                count: updatedProducts.filter(
                  (product) => product.categorySlug === category.slug,
                ).length,
              })),
            ].map((filter) => {
              const isActive = activeCategoryFilter === filter.slug;

              return (
                <button
                  aria-pressed={isActive}
                  className={`inline-flex min-h-12 items-center gap-3 rounded-md border px-4 text-xs font-semibold uppercase tracking-[0.16em] transition duration-200 sm:px-5 ${
                    isActive
                      ? "border-[#d6a25f] bg-[#d6a25f] text-[#050403] shadow-[0_0_24px_rgba(214,162,95,0.2)]"
                      : "border-white/16 bg-black/24 text-[#e7ad61] hover:-translate-y-0.5 hover:border-[#d6a25f]/70 hover:bg-[#d6a25f]/10 hover:text-white"
                  }`}
                  key={filter.slug}
                  onClick={() => {
                    setActiveCategoryFilter(filter.slug);
                    setExpandedProductSlug(null);
                  }}
                  type="button"
                >
                  <span>{filter.label}</span>
                  <span
                    className={`rounded-full px-2 py-1 text-[0.65rem] tracking-[0.08em] ${
                      isActive ? "bg-[#050403]/12" : "bg-white/10 text-[#d8cabc]"
                    }`}
                  >
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 grid gap-5">
          {filteredProducts.map((product) => {
            const draft = drafts[product.slug] ?? createDraft(product);
            const imageSrc = draft.imageUrl || getProductImageSrc(product);
            const isExpanded = expandedProductSlug === product.slug;

            return (
              <article
                className="rounded-lg border border-white/14 bg-[#0e0906]/76 p-4 shadow-[0_24px_62px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-5"
                key={product.slug}
                ref={(element) => {
                  productCardRefs.current[product.slug] = element;
                }}
              >
                <div className="grid gap-4 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center">
                  <div className="relative aspect-square overflow-hidden rounded-md border border-[#d6a25f]/35 bg-[linear-gradient(145deg,#18110d,#070504)]">
                    <Image
                      alt={draft.title}
                      className="object-contain object-center p-3"
                      fill
                      sizes="7rem"
                      src={imageSrc}
                    />
                  </div>
                  <h2 className="font-display text-3xl font-semibold leading-none text-white sm:text-4xl">
                    {draft.title}
                  </h2>
                  <button
                    aria-expanded={isExpanded}
                    className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md border border-[#d6a25f]/70 px-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#e7ad61] transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a25f]/10 hover:text-white"
                    onClick={() => toggleProductEditor(product.slug)}
                    type="button"
                  >
                    <Pencil size={16} aria-hidden="true" />
                    {isExpanded ? "Close" : "Edit"}
                    <ChevronDown
                      className={`transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      size={17}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                {isExpanded ? (
                  <form
                    className="mt-6 grid gap-6 border-t border-white/12 pt-6 lg:grid-cols-[18rem_1fr] lg:items-start"
                    onSubmit={(event) => handleProductSubmit(event, product)}
                  >
                    <div className="grid gap-4">
                  <div className="relative aspect-[0.82] overflow-hidden rounded-md border border-[#d6a25f]/35 bg-[linear-gradient(145deg,#18110d,#070504)]">
                    <Image
                      alt={draft.title}
                      className="object-contain object-center p-4"
                      fill
                      sizes="18rem"
                      src={imageSrc}
                    />
                  </div>

                  <ProductPrice product={product} />

                  <label className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-3 rounded-md border border-[#d6a25f]/60 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#e7ad61] transition hover:bg-[#d6a25f]/10 hover:text-white">
                    <UploadCloud size={16} aria-hidden="true" />
                    Upload Image
                    <input
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(event) => handleImageFileChange(product, event)}
                      type="file"
                    />
                  </label>

                  <Link
                    className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e7ad61] transition hover:text-white"
                    href={getProductHref(product)}
                  >
                    View public page
                  </Link>
                    </div>

                    <div className="grid gap-5">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <label className={fieldLabelClass}>
                      Name
                      <input
                        className={fieldControlClass}
                        onChange={(event) =>
                          updateDraft(product, { title: event.target.value })
                        }
                        value={draft.title}
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      Category
                      <input
                        className={fieldControlClass}
                        onChange={(event) =>
                          updateDraft(product, {
                            category: event.target.value,
                          })
                        }
                        value={draft.category}
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      Eyebrow
                      <input
                        className={fieldControlClass}
                        onChange={(event) =>
                          updateDraft(product, { eyebrow: event.target.value })
                        }
                        value={draft.eyebrow}
                      />
                    </label>
                    <div className="grid content-end gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#e7ad61]">
                      Base Price
                      <div className="flex min-h-12 items-center rounded-md border border-white/14 bg-black/18 px-4 text-base normal-case tracking-[0] text-white">
                        ${getProductBasePrice(product)}
                      </div>
                    </div>
                  </div>

                  <label className="flex min-h-12 items-center justify-between gap-4 rounded-md border border-white/14 bg-black/20 px-4 text-sm text-[#f7f1e8]">
                    <span className="font-semibold uppercase tracking-[0.12em] text-[#e7ad61]">
                      Limited Edition
                    </span>
                    <input
                      checked={draft.limitedEdition}
                      className="h-5 w-5 accent-[#d6a25f]"
                      onChange={(event) =>
                        updateDraft(product, {
                          limitedEdition: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                  </label>

                  <label className={fieldLabelClass}>
                    Short Intro
                    <textarea
                      className={textareaClass}
                      onChange={(event) =>
                        updateDraft(product, { intro: event.target.value })
                      }
                      value={draft.intro}
                    />
                  </label>

                  <label className={fieldLabelClass}>
                    Description
                    <textarea
                      className="min-h-36 w-full min-w-0 rounded-md border border-white/14 bg-black/28 px-4 py-3 text-base font-normal normal-case tracking-[0] text-white outline-none transition focus:border-[#d6a25f]"
                      onChange={(event) =>
                        updateDraft(product, {
                          description: event.target.value,
                        })
                      }
                      value={draft.description}
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className={fieldLabelClass}>
                      Material
                      <input
                        className={fieldControlClass}
                        onChange={(event) =>
                          updateDraft(product, {
                            material: event.target.value,
                          })
                        }
                        value={draft.material}
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      Finish
                      <input
                        className={fieldControlClass}
                        onChange={(event) =>
                          updateDraft(product, { finish: event.target.value })
                        }
                        value={draft.finish}
                      />
                    </label>
                  </div>

                  <label className={fieldLabelClass}>
                    Price Note
                    <input
                      className={fieldControlClass}
                      onChange={(event) =>
                        updateDraft(product, {
                          priceNote: event.target.value,
                        })
                      }
                      value={draft.priceNote}
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className={fieldLabelClass}>
                      Details
                      <textarea
                        className={textareaClass}
                        onChange={(event) =>
                          updateDraft(product, {
                            detailsText: event.target.value,
                          })
                        }
                        value={draft.detailsText}
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      Specs
                      <textarea
                        className={textareaClass}
                        onChange={(event) =>
                          updateDraft(product, {
                            specsText: event.target.value,
                          })
                        }
                        value={draft.specsText}
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      Layout Tags
                      <textarea
                        className={textareaClass}
                        onChange={(event) =>
                          updateDraft(product, {
                            layoutTagsText: event.target.value,
                          })
                        }
                        value={draft.layoutTagsText}
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-[linear-gradient(135deg,#efbd75,#c7802e)] px-6 text-xs font-semibold uppercase tracking-[0.16em] !text-[#050403] transition duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
                      type="submit"
                    >
                      <Save size={16} aria-hidden="true" />
                      Save Product
                    </button>
                    {statusBySlug[product.slug] ? (
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#e7ad61]">
                        {statusBySlug[product.slug] === "Saved" ? (
                          <Check size={16} aria-hidden="true" />
                        ) : null}
                        {statusBySlug[product.slug]}
                      </span>
                    ) : null}
                  </div>
                    </div>
                  </form>
                ) : null}
              </article>
            );
          })}

          {!productsLoading && filteredProducts.length === 0 ? (
            <div className="rounded-lg border border-white/14 bg-[#0e0906]/76 p-8 text-center text-base leading-7 text-[#d8cabc]">
              No products are in this category yet.
            </div>
          ) : null}

          {productsLoading ? (
            <div className="inline-flex items-center gap-3 text-[#e7ad61]">
              <LoaderCircle className="animate-spin" size={20} aria-hidden="true" />
              <span className="text-sm font-semibold uppercase tracking-[0.18em]">
                Loading Firebase products
              </span>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Mail,
  MapPin,
  Phone,
  Ruler,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ProductImageViewer } from "@/components/ProductImageViewer";
import { ProductPrice } from "@/components/ProductPrice";
import { getFirebaseFirestore, getFirebaseFunctions } from "@/lib/firebase";
import { useProductCatalog } from "@/lib/product-catalog";
import { getProductImageSrc } from "@/lib/product-pricing";
import type { ApronProduct } from "@/lib/site-data";
import { apronProducts, getProductHref } from "@/lib/site-data";

type PreferredContact = "Email" | "Phone";

type ProductInquiryForm = {
  name: string;
  email: string;
  phone: string;
  preferredContact: PreferredContact;
  shippingAddress: string;
  message: string;
};

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

const PRODUCT_INQUIRY_SUBMIT_TIMEOUT_MS = 30000;
const PUBLIC_SITE_ORIGIN = "https://upgradeaprons.web.app";

const initialInquiryForm: ProductInquiryForm = {
  name: "",
  email: "",
  phone: "",
  preferredContact: "Email",
  shippingAddress: "",
  message: "",
};

const fieldLabelClass =
  "grid min-w-0 gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#e7ad61]";

const fieldControlClass =
  "min-h-12 w-full min-w-0 rounded-md border border-white/14 bg-black/28 px-4 text-base font-normal normal-case tracking-[0] text-white outline-none transition focus:border-[#d6a25f]";

const selectControlClass = `${fieldControlClass} appearance-none pr-14`;

const textareaClass =
  "min-h-24 w-full min-w-0 rounded-md border border-white/14 bg-black/28 px-4 py-3 text-base font-normal normal-case tracking-[0] text-white outline-none transition focus:border-[#d6a25f]";

function getPreferredContact(
  email: string,
  phone: string,
  preferredContact: string,
): PreferredContact {
  const hasEmail = Boolean(email.trim());
  const hasPhone = Boolean(phone.trim());

  if (hasEmail && !hasPhone) {
    return "Email";
  }

  if (hasPhone && !hasEmail) {
    return "Phone";
  }

  return preferredContact === "Phone" ? "Phone" : "Email";
}

function isLocalPreviewHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

function buildPublicSiteUrl(path: string) {
  const value = path.trim();

  if (!value) {
    return value;
  }

  try {
    const url = new URL(value, PUBLIC_SITE_ORIGIN);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return value;
    }

    if (isLocalPreviewHost(url.hostname)) {
      return new URL(`${url.pathname}${url.search}${url.hash}`, PUBLIC_SITE_ORIGIN)
        .toString();
    }

    return url.toString();
  } catch {
    return value;
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export function ProductDetailPage({ product }: { product: ApronProduct }) {
  const reduceMotion = useReducedMotion();
  const [inquiryForm, setInquiryForm] =
    useState<ProductInquiryForm>(initialInquiryForm);
  const [inquiryStatus, setInquiryStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const { products: catalogProducts } = useProductCatalog(apronProducts);
  const displayProduct =
    catalogProducts.find((item) => item.slug === product.slug) ?? product;
  const relatedProducts = catalogProducts
    .filter(
      (item) =>
        item.slug !== displayProduct.slug &&
        item.categorySlug === displayProduct.categorySlug,
    )
    .slice(0, 3);
  const hasInquiryEmail = Boolean(inquiryForm.email.trim());
  const hasInquiryPhone = Boolean(inquiryForm.phone.trim());
  const preferredContactOptions = useMemo<PreferredContact[]>(() => {
    if (hasInquiryEmail && !hasInquiryPhone) {
      return ["Email"];
    }

    if (hasInquiryPhone && !hasInquiryEmail) {
      return ["Phone"];
    }

    return ["Email", "Phone"];
  }, [hasInquiryEmail, hasInquiryPhone]);
  const isPreferredContactLocked = preferredContactOptions.length === 1;
  const preferredContactValue = getPreferredContact(
    inquiryForm.email,
    inquiryForm.phone,
    inquiryForm.preferredContact,
  );

  const updateInquiryField = <Field extends keyof ProductInquiryForm>(
    field: Field,
    value: ProductInquiryForm[Field],
  ) => {
    setInquiryForm((current) => {
      const next = { ...current, [field]: value } as ProductInquiryForm;

      if (
        field === "email" ||
        field === "phone" ||
        field === "preferredContact"
      ) {
        return {
          ...next,
          preferredContact: getPreferredContact(
            next.email,
            next.phone,
            next.preferredContact,
          ),
        };
      }

      return next;
    });

    if (inquiryStatus !== "idle") {
      setInquiryStatus("idle");
      setInquiryMessage("");
    }
  };

  const handleInquirySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = inquiryForm.name.trim();
    const email = inquiryForm.email.trim().toLowerCase();
    const phone = inquiryForm.phone.trim();
    const preferredContact = getPreferredContact(
      email,
      phone,
      inquiryForm.preferredContact,
    );
    const shippingAddress = inquiryForm.shippingAddress.trim();
    const message = inquiryForm.message.trim();

    if (!email && !phone) {
      setInquiryStatus("error");
      setInquiryMessage("Please include an email or phone number.");
      return;
    }

    if (!message) {
      setInquiryStatus("error");
      setInquiryMessage("Please include a message about this apron.");
      return;
    }

    const submission = {
      name,
      email,
      phone,
      preferredContact,
      shippingAddress,
      message,
      product: {
        title: displayProduct.title,
        slug: displayProduct.slug,
        category: displayProduct.category,
        image: getProductImageSrc(displayProduct),
        imageUrl: buildPublicSiteUrl(getProductImageSrc(displayProduct)),
        pageUrl: buildPublicSiteUrl(getProductHref(displayProduct)),
      },
      source: "product-detail-page",
    };

    setInquiryStatus("submitting");
    setInquiryMessage("");

    try {
      const functions = await withTimeout(
        getFirebaseFunctions(),
        PRODUCT_INQUIRY_SUBMIT_TIMEOUT_MS,
        "Firebase Functions initialization timed out.",
      );

      if (!functions) {
        throw new Error("Firebase Functions unavailable");
      }

      const { httpsCallable } = await withTimeout(
        import("firebase/functions"),
        PRODUCT_INQUIRY_SUBMIT_TIMEOUT_MS,
        "Firebase Functions tools did not load.",
      );
      const submitProductInquiry = httpsCallable(
        functions,
        "submitProductInquiry",
      );

      await withTimeout(
        submitProductInquiry(submission),
        PRODUCT_INQUIRY_SUBMIT_TIMEOUT_MS,
        "Product inquiry email handoff timed out.",
      );

      setInquiryForm(initialInquiryForm);
      setInquiryStatus("success");
      setInquiryMessage(`Your question about ${displayProduct.title} was sent.`);
    } catch (primaryError) {
      console.warn(
        "Product inquiry callable submission failed; trying Firestore queue.",
        primaryError,
      );

      try {
        const db = await withTimeout(
          getFirebaseFirestore(),
          PRODUCT_INQUIRY_SUBMIT_TIMEOUT_MS,
          "Firebase Firestore initialization timed out.",
        );

        if (!db) {
          throw new Error("Firestore unavailable");
        }

        const { addDoc, collection, serverTimestamp } = await withTimeout(
          import("firebase/firestore"),
          PRODUCT_INQUIRY_SUBMIT_TIMEOUT_MS,
          "Firebase Firestore tools did not load.",
        );

        await withTimeout(
          addDoc(collection(db, "productInquiries"), {
            ...submission,
            emailStatus: "pending",
            createdAt: serverTimestamp(),
          }),
          PRODUCT_INQUIRY_SUBMIT_TIMEOUT_MS,
          "Product inquiry submission timed out.",
        );

        setInquiryForm(initialInquiryForm);
        setInquiryStatus("success");
        setInquiryMessage(`Your question about ${displayProduct.title} was sent.`);
      } catch (fallbackError) {
        console.warn("Product inquiry submission failed.", fallbackError);
        setInquiryStatus("error");
        setInquiryMessage(
          "The message could not send right now. Please try again in a moment.",
        );
      }
    }
  };

  const inquiryFormCard = (
    <motion.section
      className="mt-20"
      variants={cardReveal}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.18 }}
    >
      <form
        className="grid gap-5 rounded-lg border border-white/16 bg-[#0e0906]/72 p-5 shadow-[0_24px_62px_rgba(0,0,0,0.26)] backdrop-blur-md sm:p-8 lg:p-10"
        onSubmit={handleInquirySubmit}
      >
        <div className="flex items-start gap-4">
          <span className="inline-flex size-11 flex-none items-center justify-center rounded-md border border-[#d6a25f]/60 text-[#e7ad61]">
            <Mail size={20} strokeWidth={1.55} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-3xl font-semibold leading-none text-white sm:text-4xl">
              Ask About This Apron
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#cdbdaa] sm:text-base sm:leading-7">
              Send your contact details, shipping address, and question directly
              to Upgrade Aprons.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={fieldLabelClass}>
            Name
            <input
              className={fieldControlClass}
              onChange={(event) => updateInquiryField("name", event.target.value)}
              type="text"
              value={inquiryForm.name}
            />
          </label>
          <label className={fieldLabelClass}>
            Email
            <input
              className={fieldControlClass}
              onChange={(event) => updateInquiryField("email", event.target.value)}
              type="email"
              value={inquiryForm.email}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={fieldLabelClass}>
            Phone
            <span className="relative block">
              <Phone
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#e7ad61]"
                size={17}
                strokeWidth={1.55}
              />
              <input
                className={`${fieldControlClass} pr-12`}
                onChange={(event) =>
                  updateInquiryField("phone", event.target.value)
                }
                type="tel"
                value={inquiryForm.phone}
              />
            </span>
          </label>
          <label className={fieldLabelClass}>
            Preferred Reply
            <span className="relative block">
              <select
                className={`${selectControlClass} disabled:cursor-not-allowed disabled:opacity-70`}
                disabled={isPreferredContactLocked}
                onChange={(event) =>
                  updateInquiryField(
                    "preferredContact",
                    event.target.value as PreferredContact,
                  )
                }
                value={preferredContactValue}
              >
                {preferredContactOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[#e7ad61]"
                size={18}
              />
            </span>
          </label>
        </div>

        <label className={fieldLabelClass}>
          Shipping Address
          <span className="relative block">
            <MapPin
              aria-hidden="true"
              className="pointer-events-none absolute right-4 top-4 text-[#e7ad61]"
              size={17}
              strokeWidth={1.55}
            />
            <textarea
              className={`${textareaClass} pr-12`}
              onChange={(event) =>
                updateInquiryField("shippingAddress", event.target.value)
              }
              value={inquiryForm.shippingAddress}
            />
          </span>
        </label>

        <label className={fieldLabelClass}>
          Message
          <textarea
            className={textareaClass}
            onChange={(event) =>
              updateInquiryField("message", event.target.value)
            }
            required
            value={inquiryForm.message}
          />
        </label>

        <button
          className="inline-flex min-h-14 items-center justify-center gap-3 rounded-md bg-[linear-gradient(135deg,#efbd75,#c7802e)] px-7 text-sm font-semibold uppercase tracking-[0.18em] !text-[#050403] shadow-[0_0_30px_rgba(214,162,95,0.26)] transition duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70 sm:w-fit"
          disabled={inquiryStatus === "submitting"}
          type="submit"
        >
          <Mail size={19} aria-hidden="true" />
          {inquiryStatus === "submitting" ? "Sending" : "Ask About This Apron"}
        </button>

        {inquiryMessage ? (
          <p
            aria-live="polite"
            className={`text-sm font-semibold ${
              inquiryStatus === "success" ? "text-[#e7ad61]" : "text-[#f0a6a6]"
            }`}
          >
            {inquiryMessage}
          </p>
        ) : null}
      </form>
    </motion.section>
  );

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#050403] px-6 pb-24 pt-36 text-[#f7f1e8] sm:px-10 sm:pt-40 lg:px-12 lg:pb-32 lg:pt-44">
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_20%,rgba(214,162,95,0.15),transparent_30%),linear-gradient(180deg,#050403_0%,#090604_48%,#050403_100%)]"
        aria-hidden="true"
      />

      <motion.div
        className="mx-auto max-w-[112rem]"
        variants={stagger}
        initial={reduceMotion ? false : "hidden"}
        animate={reduceMotion ? undefined : "visible"}
      >
        <motion.div variants={fadeUp}>
          <Link
            href="/products"
            className="inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#e7ad61] transition hover:text-white"
          >
            <ArrowLeft size={20} aria-hidden="true" />
            Back to Aprons
          </Link>
        </motion.div>

        <section
          className="mt-10 grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(30rem,0.78fr)] lg:items-start lg:gap-20"
          data-product-slug={displayProduct.slug}
        >
          <motion.div variants={cardReveal}>
            <ProductImageViewer
              src={getProductImageSrc(displayProduct)}
              alt={displayProduct.title}
              priority
              sizes="(min-width: 1024px) 58vw, 100vw"
              frameClassName={`overflow-hidden rounded-lg border border-[#d6a25f]/60 bg-[radial-gradient(circle_at_50%_34%,rgba(214,162,95,0.16),transparent_58%),linear-gradient(145deg,#18110d,#070504)] shadow-[0_28px_70px_rgba(0,0,0,0.38)] ${
                displayProduct.categorySlug === "half-apron"
                  ? "aspect-[1.42]"
                  : "aspect-[0.82]"
              }`}
              imageClassName="object-contain object-center p-7 sm:p-9"
            />
            {displayProduct.alternateImages?.length ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Additional product photos">
                {displayProduct.alternateImages.map((image, index) => (
                  <ProductImageViewer
                    key={image}
                    src={image}
                    alt={`${displayProduct.title}, alternate view ${index + 1}`}
                    sizes="(min-width: 1024px) 18vw, 45vw"
                    frameClassName="aspect-[1.42] overflow-hidden rounded-md border border-white/20 bg-black/20"
                    imageClassName="object-contain object-center p-2"
                  />
                ))}
              </div>
            ) : null}
          </motion.div>

          <motion.div variants={fadeUp}>
            <p
              className="text-xs font-bold uppercase tracking-[0.24em]"
              style={{ color: displayProduct.accent }}
            >
              <span data-product-field="eyebrow">{displayProduct.eyebrow}</span>
            </p>
            <h1 className="font-display mt-5 text-6xl font-semibold leading-[0.92] text-[#f8f2e9] sm:text-7xl lg:text-8xl">
              <span data-product-field="title">{displayProduct.title}</span>
            </h1>
            <div
              className="my-8 h-[3px] w-16"
              style={{ backgroundColor: displayProduct.accent }}
            />
            <p className="text-lg leading-8 text-[#d8cabc] sm:text-xl">
              <span data-product-field="description">{displayProduct.description}</span>
            </p>
            <ProductPrice product={displayProduct} className="mt-8" />
            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {displayProduct.specs.map((spec, index) => (
                <div
                  className="rounded-lg border border-white/16 bg-[#0e0906]/72 p-5"
                  key={index}
                >
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#e7ad61]">
                    <span data-product-field="specs" data-product-index={index} data-product-part="label">{spec.label}</span>
                  </span>
                  <strong className="mt-3 block font-display text-2xl font-semibold leading-tight text-white">
                    <span data-product-field="specs" data-product-index={index} data-product-part="value">{spec.value}</span>
                  </strong>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {inquiryFormCard}

        <motion.section
          className="mt-20 grid gap-8 lg:grid-cols-[0.84fr_1fr]"
          variants={stagger}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.article
            className="rounded-lg border border-white/16 bg-[#0e0906]/72 p-8 shadow-[0_24px_62px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-10"
            data-product-slug={displayProduct.slug}
            variants={cardReveal}
          >
            <div className="mb-7 inline-flex size-14 items-center justify-center rounded-full border border-[#d6a25f]/80 text-[#e7ad61]">
              <ShieldCheck size={28} strokeWidth={1.35} aria-hidden="true" />
            </div>
            <h2 className="font-display text-4xl font-semibold leading-none text-white">
              Build Details
            </h2>
            <div className="my-6 h-px w-14 bg-[#d6a25f]" />
            <ul className="grid gap-4 text-base leading-7 text-[#d8cabc]">
              {displayProduct.details.map((detail, index) => (
                <li className="flex gap-3" key={detail}>
                  <Check
                    className="mt-1 flex-none text-[#e7ad61]"
                    size={20}
                    aria-hidden="true"
                  />
                  <span data-product-field="details" data-product-index={index}>{detail}</span>
                </li>
              ))}
            </ul>
          </motion.article>

          <motion.article
            className="rounded-lg border border-white/16 bg-[#0e0906]/72 p-8 shadow-[0_24px_62px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-10"
            data-product-slug={displayProduct.slug}
            variants={cardReveal}
          >
            <div className="mb-7 inline-flex size-14 items-center justify-center rounded-full border border-[#d6a25f]/80 text-[#e7ad61]">
              <Ruler size={28} strokeWidth={1.35} aria-hidden="true" />
            </div>
            <h2 className="font-display text-4xl font-semibold leading-none text-white">
              Apron Type
            </h2>
            <div className="my-6 h-px w-14 bg-[#d6a25f]" />
            <div className="flex flex-wrap gap-3">
              {displayProduct.layoutTags.map((item, index) => (
                <span
                  className="rounded-full border border-[#d6a25f]/42 bg-black/24 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#e7ad61]"
                  key={item}
                >
                  <span data-product-field="layoutTags" data-product-index={index}>{item}</span>
                </span>
              ))}
            </div>
            <div className="mt-8 border-t border-white/12 pt-7">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e7ad61]">
                Pricing
              </p>
              <p className="mt-3 text-base leading-7 text-[#d8cabc]">
                <span data-product-field="priceNote">{displayProduct.priceNote}</span>
              </p>
            </div>
            <Link
              href="/products"
              className="mt-8 inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#e7ad61] transition hover:text-white"
            >
              <Sparkles size={20} aria-hidden="true" />
              Compare Aprons
            </Link>
          </motion.article>
        </motion.section>

        {relatedProducts.length > 0 ? <motion.section
          className="mt-20"
          variants={stagger}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.18 }}
        >
          <motion.div variants={fadeUp}>
            <p className="inline-flex items-center gap-4 text-[0.82rem] font-bold uppercase tracking-[0.24em] text-[#e7ad61] sm:text-[0.95rem]">
              <Sparkles size={30} strokeWidth={1.45} aria-hidden="true" />
              <span>More Aprons</span>
            </p>
            <h2 className="font-display mt-6 text-5xl font-semibold leading-[0.96] text-white sm:text-6xl">
              Compare the work.
            </h2>
          </motion.div>

          <motion.div className="mt-10 grid gap-6 lg:grid-cols-3" variants={stagger}>
            {relatedProducts.map((related) => (
              <motion.article
                className="overflow-hidden rounded-lg border border-white/16 bg-[#0e0906]/72 shadow-[0_20px_48px_rgba(0,0,0,0.26)] backdrop-blur-md"
                data-product-slug={related.slug}
                key={related.slug}
                variants={cardReveal}
              >
                <ProductImageViewer
                  src={getProductImageSrc(related)}
                  alt={related.title}
                  sizes="(min-width: 1024px) 31vw, 100vw"
                  frameClassName="aspect-[1.12] overflow-hidden bg-[radial-gradient(circle_at_50%_34%,rgba(214,162,95,0.13),transparent_58%),linear-gradient(145deg,#18110d,#070504)]"
                  imageClassName="object-contain object-center p-5 transition duration-700 hover:scale-[1.035]"
                />
                <div className="p-7">
                  <p
                    className="text-xs font-bold uppercase tracking-[0.18em]"
                    style={{ color: related.accent }}
                  >
                    <span data-product-field="category">{related.category}</span>
                  </p>
                  <h3 className="font-display mt-4 text-3xl font-semibold leading-none text-white">
                    <span data-product-field="title">{related.title}</span>
                  </h3>
                  <p className="mt-5 text-sm leading-6 text-[#d8cabc]">
                    <span data-product-field="intro">{related.intro}</span>
                  </p>
                  <ProductPrice product={related} className="mt-5" />
                  <Link
                    href={getProductHref(related)}
                    className="mt-6 inline-flex text-sm font-semibold uppercase tracking-[0.18em] text-[#e7ad61] transition hover:text-white"
                  >
                    View Details
                  </Link>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </motion.section> : null}
      </motion.div>
    </main>
  );
}

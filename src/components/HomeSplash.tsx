"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Hammer,
  Heart,
  Mail,
  Palette,
  Recycle,
  Ruler,
  Scissors,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { LuxuryNav } from "@/components/LuxuryNav";

const featureCards = [
  {
    title: "Repurposed Genuine Top-Grain Leather",
    copy: "Beautiful 100% natural top-grain leather from 40+ years of upholstery remnants outlasts other materials and gains patina with use.",
    Icon: Recycle,
  },
  {
    title: "Made for the Work",
    copy: "Pocket layouts, panel choices, and straps are chosen for real shops, kitchens, studios, and gardens.",
    Icon: Ruler,
  },
  {
    title: "Built by Hand",
    copy: "Every piece is cut, stitched, and finished with the kind of detail that only hands-on craft can keep honest.",
    Icon: Scissors,
  },
];

const aboutValues = [
  {
    title: "40+ Years",
    copy: "Decades of upholstery experience behind every seam, strap, and pocket.",
    Icon: Hammer,
  },
  {
    title: "Custom Ready",
    copy: "Color, pocket placement, and function can be tailored to the way you work.",
    Icon: Palette,
  },
  {
    title: "Made to Last",
    copy: "Durable leather, practical construction, and details designed to age well.",
    Icon: ShieldCheck,
  },
];

const galleryItems = [
  {
    title: "Workshop Aprons",
    category: "Ready to Work",
    copy: "Functional layouts with deep contrast pockets, reinforced hardware, and durable leather panels.",
    image: "/images/splash-background-photo-1.jpg",
    accent: "#d6a25f",
  },
  {
    title: "Custom Orders",
    category: "Personal Build",
    copy: "One-off pieces shaped around the wearer, the trade, and the tools they reach for every day.",
    image: "/images/story-customer.jpg",
    accent: "#b95438",
  },
  {
    title: "Market Favorites",
    category: "Whidbey Made",
    copy: "Aprons tested in public, handled in person, and chosen for their color, weight, and feel.",
    image: "/images/story-market.jpg",
    accent: "#2b8c86",
  },
  {
    title: "Family Craft",
    category: "Handmade",
    copy: "A small-shop process built around care, experience, and direct attention to each finished piece.",
    image: "/images/story-family-cropped.png",
    accent: "#8f6ea6",
  },
];

const apronCollections = [
  {
    title: "Maker Aprons",
    category: "Studios + Shops",
    copy: "Durable leather coverage for artists, woodworkers, jewelers, ceramicists, and anyone working with tools.",
    detail: "Deep pockets, reinforced stress points, and a balanced fit for long work sessions.",
    image: "/images/splash-background-photo-1.jpg",
    accent: "#d6a25f",
    Icon: Hammer,
  },
  {
    title: "Kitchen Aprons",
    category: "Cooks + Hosts",
    copy: "Leather aprons with enough polish for service and enough function for prep, grilling, and daily cooking.",
    detail: "Comfortable straps, wipeable panels, and useful front storage without bulk.",
    image: "/images/upgrade-aprons-splash.png",
    accent: "#b95438",
    Icon: Heart,
  },
  {
    title: "Garden Aprons",
    category: "Garden + Market",
    copy: "Practical builds for carrying clippers, seed packets, gloves, tags, and the small things that vanish mid-task.",
    detail: "Flexible layouts made for movement, texture, weathering, and everyday utility.",
    image: "/images/story-market.jpg",
    accent: "#2b8c86",
    Icon: Recycle,
  },
  {
    title: "Custom Aprons",
    category: "Built Around You",
    copy: "Color, pocket placement, hardware, strap style, and panel composition shaped around the wearer.",
    detail: "A unique apron for a trade, hobby, gift, business, or personal work rhythm.",
    image: "/images/story-customer.jpg",
    accent: "#8f6ea6",
    Icon: Palette,
  },
];

const processSteps = [
  {
    step: "01",
    title: "Choose the purpose",
    copy: "Start with how the apron will be used, what tools it needs to carry, and how much coverage feels right.",
    Icon: Ruler,
  },
  {
    step: "02",
    title: "Select the leather",
    copy: "Repurposed genuine leather pieces are matched for color, weight, texture, and the kind of character the finished apron should carry.",
    Icon: Recycle,
  },
  {
    step: "03",
    title: "Cut and stitch",
    copy: "Panels, pockets, straps, and hardware are assembled by hand with attention to stress points and everyday wear.",
    Icon: Scissors,
  },
  {
    step: "04",
    title: "Finish for use",
    copy: "The final apron is checked for comfort, pocket access, proportion, durability, and the details that make it feel personal.",
    Icon: ShieldCheck,
  },
];

const marketStats = [
  {
    value: "40+",
    label: "Years",
    copy: "Upholstery and leather experience behind the craft.",
  },
  {
    value: "1 of 1",
    label: "Custom Builds",
    copy: "Each apron carries its own color story and purpose.",
  },
  {
    value: "Whidbey",
    label: "Made",
    copy: "Designed, cut, and finished with island craft sensibility.",
  },
];

const faqItems = [
  {
    question: "Do you make custom aprons?",
    answer:
      "Yes. Custom orders can include color direction, pocket placement, apron length, strap preferences, and job-specific details.",
  },
  {
    question: "What are the aprons made from?",
    answer:
      "Upgrade Aprons are made from repurposed genuine top-grain leather selected for durability, texture, and character.",
  },
  {
    question: "Can I choose colors?",
    answer:
      "Color availability depends on the leather on hand, but each custom build can be guided by a preferred palette.",
  },
];

const stitchMarks = Array.from({ length: 52 }, (_, index) => index);

const heroIntro: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.18,
    },
  },
};

const cardsStagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.22,
    },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
  },
};

const headlineMain: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
  },
};

const headlineAccent: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delay: 0.18, duration: 1.0, ease: [0.22, 1, 0.36, 1] },
  },
};

const lineReveal: Variants = {
  hidden: { opacity: 0, scaleX: 0 },
  visible: {
    opacity: 1,
    scaleX: 1,
    transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
  },
};

const cardReveal: Variants = {
  hidden: { opacity: 0, y: 34, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
};

type IconCard = {
  title: string;
  copy: string;
  Icon: LucideIcon;
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

function FeatureCard({ card }: { card: IconCard }) {
  const { Icon } = card;

  return (
    <motion.article
      className="relative grid min-h-[15rem] grid-cols-[4rem_1fr] gap-6 overflow-hidden rounded-lg border border-white/18 bg-[#0e0906]/66 p-7 shadow-[0_22px_50px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-9 xl:min-h-[15.6rem]"
      variants={cardReveal}
    >
      <div className="pointer-events-none absolute inset-0 bg-white/[0.045]" />
      <motion.div
        className="relative z-10 flex size-14 items-center justify-center rounded-full border border-[#d6a25f] text-[#e7ad61]"
        variants={fadeUp}
      >
        <Icon size={30} strokeWidth={1.35} aria-hidden="true" />
      </motion.div>
      <div className="relative z-10">
        <motion.h2
          className="font-display text-3xl font-semibold leading-[0.98] text-white sm:text-4xl"
          variants={fadeUp}
        >
          {card.title}
        </motion.h2>
        <motion.div
          className="mt-6 h-px w-16 origin-left bg-[#d6a25f]"
          variants={lineReveal}
        />
      </div>
      <motion.p
        className="relative z-10 col-span-2 text-base leading-7 text-[#e0d1bf] sm:text-lg"
        variants={fadeUp}
      >
        {card.copy}
      </motion.p>
    </motion.article>
  );
}

function AboutValue({ value }: { value: IconCard }) {
  const { Icon } = value;

  return (
    <motion.div className="text-left sm:text-center" variants={fadeUp}>
      <div className="mb-5 inline-flex size-16 items-center justify-center rounded-full border border-[#d6a25f]/80 text-[#e7ad61]">
        <Icon size={32} strokeWidth={1.25} aria-hidden="true" />
      </div>
      <h4 className="font-display text-2xl font-semibold leading-none text-white">
        {value.title}
      </h4>
      <div className="my-5 h-px w-14 bg-[#d6a25f] sm:mx-auto" />
      <p className="text-sm leading-6 text-[#d8cabc] sm:text-base">
        {value.copy}
      </p>
    </motion.div>
  );
}

function CollectionCard({
  collection,
}: {
  collection: (typeof apronCollections)[number];
}) {
  const { Icon } = collection;

  return (
    <motion.article
      className="group relative min-h-[34rem] overflow-hidden rounded-lg border border-white/16 bg-[#0e0906]/76 shadow-[0_24px_62px_rgba(0,0,0,0.34)]"
      variants={cardReveal}
    >
      <Image
        src={collection.image}
        alt=""
        fill
        sizes="(min-width: 1280px) 24vw, (min-width: 768px) 48vw, 100vw"
        className="object-cover opacity-75 transition duration-700 group-hover:scale-[1.035] group-hover:opacity-90"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,3,0.06)_0%,rgba(5,4,3,0.72)_47%,rgba(5,4,3,0.96)_100%)]" />
      <div className="relative z-10 flex min-h-[34rem] flex-col justify-end p-7 sm:p-8">
        <div
          className="mb-6 inline-flex size-14 items-center justify-center rounded-full border bg-black/35"
          style={
            {
              borderColor: collection.accent,
              color: collection.accent,
            } as CSSProperties
          }
        >
          <Icon size={28} strokeWidth={1.35} aria-hidden="true" />
        </div>
        <p
          className="text-xs font-bold uppercase tracking-[0.2em]"
          style={{ color: collection.accent } as CSSProperties}
        >
          {collection.category}
        </p>
        <h3 className="font-display mt-4 text-4xl font-semibold leading-none text-white">
          {collection.title}
        </h3>
        <div
          className="my-6 h-px w-14"
          style={{ backgroundColor: collection.accent } as CSSProperties}
        />
        <p className="text-base leading-7 text-[#e4d5c5]">{collection.copy}</p>
        <p className="mt-5 border-t border-white/12 pt-5 text-sm leading-6 text-[#c9b8a6]">
          {collection.detail}
        </p>
      </div>
    </motion.article>
  );
}

function ProcessStep({ step }: { step: (typeof processSteps)[number] }) {
  const { Icon } = step;

  return (
    <motion.article
      className="grid gap-5 border-b border-white/12 pb-8 last:border-b-0 last:pb-0 sm:grid-cols-[5rem_1fr]"
      variants={fadeUp}
    >
      <div className="flex items-start gap-4 sm:block">
        <span className="font-display block text-4xl font-semibold leading-none text-[#d6a25f]">
          {step.step}
        </span>
        <span className="mt-5 inline-flex size-12 items-center justify-center rounded-full border border-[#d6a25f]/70 text-[#e7ad61] sm:flex">
          <Icon size={24} strokeWidth={1.35} aria-hidden="true" />
        </span>
      </div>
      <div>
        <h3 className="font-display text-3xl font-semibold leading-none text-white">
          {step.title}
        </h3>
        <p className="mt-4 text-base leading-7 text-[#d8cabc]">{step.copy}</p>
      </div>
    </motion.article>
  );
}

function MarketStat({ stat }: { stat: (typeof marketStats)[number] }) {
  return (
    <motion.div
      className="border-l border-[#d6a25f]/50 pl-6"
      variants={fadeUp}
    >
      <strong className="font-display block text-5xl font-semibold leading-none text-[#e7ad61]">
        {stat.value}
      </strong>
      <span className="mt-4 block text-xs font-bold uppercase tracking-[0.24em] text-white">
        {stat.label}
      </span>
      <p className="mt-3 text-sm leading-6 text-[#d8cabc]">{stat.copy}</p>
    </motion.div>
  );
}

function FaqItem({ item }: { item: (typeof faqItems)[number] }) {
  return (
    <motion.article className="border-t border-white/14 py-6" variants={fadeUp}>
      <h3 className="font-display text-2xl font-semibold leading-tight text-white">
        {item.question}
      </h3>
      <p className="mt-3 text-base leading-7 text-[#d8cabc]">{item.answer}</p>
    </motion.article>
  );
}

export function HomeSplash() {
  const reduceMotion = useReducedMotion();
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryItemsPerView, setGalleryItemsPerView] = useState(3);

  useEffect(() => {
    const mediumQuery = window.matchMedia("(max-width: 940px)");
    const smallQuery = window.matchMedia("(max-width: 620px)");

    const updateGalleryItemsPerView = () => {
      if (smallQuery.matches) {
        setGalleryItemsPerView(1);
        return;
      }

      setGalleryItemsPerView(mediumQuery.matches ? 2 : 3);
    };

    updateGalleryItemsPerView();
    mediumQuery.addEventListener("change", updateGalleryItemsPerView);
    smallQuery.addEventListener("change", updateGalleryItemsPerView);

    return () => {
      mediumQuery.removeEventListener("change", updateGalleryItemsPerView);
      smallQuery.removeEventListener("change", updateGalleryItemsPerView);
    };
  }, []);

  const visibleGalleryItems = useMemo(() => {
    const itemCount = Math.min(galleryItemsPerView, galleryItems.length);

    return Array.from({ length: itemCount }, (_, offset) => {
      return galleryItems[(galleryIndex + offset) % galleryItems.length];
    });
  }, [galleryIndex, galleryItemsPerView]);

  const moveGallery = (direction: number) => {
    setGalleryIndex((currentIndex) => {
      return (
        (currentIndex + direction + galleryItems.length) % galleryItems.length
      );
    });
  };

  return (
    <main className="relative min-h-screen bg-[#050403] text-[#f7f1e8]">
      <LuxuryNav />

      <section
        id="top"
        className="relative flex min-h-screen flex-col justify-between overflow-hidden px-6 pb-7 pt-36 sm:px-10 sm:pt-40 lg:px-12 lg:pb-10 lg:pt-44"
      >
        <div className="absolute inset-0" aria-hidden="true">
          <Image
            src="/images/apron-splash-background.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="splash-hero-image object-cover object-[62%_center]"
          />
        </div>
        <div
          className="pointer-events-none absolute inset-0 splash-hero-fade"
          aria-hidden="true"
        />

        <motion.div
          className="splash-hero-copy relative z-10 max-w-[48rem]"
          variants={heroIntro}
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
        >
          <motion.p
            className="splash-hero-kicker mb-5 text-[0.8rem] font-semibold uppercase tracking-[0.32em]"
            variants={fadeUp}
          >
            Handmade Leather Aprons
          </motion.p>
          <h1 className="font-display text-[clamp(3.7rem,6vw,6.5rem)] font-semibold leading-[0.92] tracking-[0] text-[#f8f2e9] drop-shadow-[0_8px_28px_rgba(0,0,0,0.55)]">
            <motion.span className="block" variants={headlineMain}>
              Built for work,
            </motion.span>
            <motion.span
              className="block text-[#e7ad61]"
              variants={headlineAccent}
            >
              made with character.
            </motion.span>
          </h1>
          <motion.div
            className="mt-8 h-[3px] w-16 origin-left bg-[#d6a25f]"
            variants={lineReveal}
          />
          <motion.p
            className="mt-7 max-w-[34rem] text-lg leading-8 text-[#efe0ce] sm:text-xl"
            variants={fadeUp}
          >
            Repurposed genuine top-grain leather aprons designed for makers,
            cooks, artists, and anyone who needs their gear to work as hard as
            they do.
          </motion.p>
          <motion.div
            className="mt-9 flex flex-col gap-4 sm:flex-row"
            variants={fadeUp}
          >
            <motion.a
              href="#gallery"
              className="inline-flex min-h-16 min-w-60 items-center justify-center rounded-md bg-[linear-gradient(135deg,#efbd75,#c7802e)] px-8 text-sm font-semibold uppercase tracking-[0.18em] !text-[#050403] shadow-[0_0_28px_rgba(214,162,95,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_36px_rgba(214,162,95,0.42)]"
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            >
              Gallery
            </motion.a>
            <motion.a
              href="#custom-orders"
              className="inline-flex min-h-16 min-w-60 items-center justify-center rounded-md border border-[#d6a25f]/80 bg-black/24 px-8 text-sm font-semibold uppercase tracking-[0.18em] text-[#e7ad61] transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a25f]/10"
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            >
              Custom Orders
            </motion.a>
          </motion.div>
        </motion.div>

        <motion.div
          className="relative z-10 mt-14 grid gap-6 xl:grid-cols-3"
          variants={cardsStagger}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.2 }}
        >
          {featureCards.map((card) => (
            <FeatureCard card={card} key={card.title} />
          ))}
        </motion.div>
      </section>

      <section
        id="about"
        className="relative isolate flex min-h-screen items-center overflow-hidden px-6 py-24 sm:px-10 lg:px-12 lg:py-32"
      >
        <Image
          src="/images/story-leather-bg.png"
          alt=""
          fill
          sizes="100vw"
          className="pointer-events-none -z-10 object-cover object-center"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_54%_52%,rgba(214,162,95,0.15),rgba(214,162,95,0.04)_31%,transparent_58%),linear-gradient(180deg,rgba(8,5,3,0.96)_0%,#090604_44%,#050403_100%)]"
          aria-hidden="true"
        />
        <motion.div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 overflow-hidden"
          initial={reduceMotion ? false : { opacity: 0 }}
          whileInView={reduceMotion ? undefined : { opacity: 1 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden="true"
        >
          <div className="absolute inset-x-0 top-6 h-px bg-[#d6a25f]/34" />
          <div className="absolute inset-x-0 top-6 flex -translate-y-1/2 justify-center gap-3 px-6">
            {stitchMarks.map((mark) => (
              <span
                key={mark}
                className="h-4 w-px rotate-45 rounded-full bg-[#d6a25f]/75 shadow-[0_0_10px_rgba(214,162,95,0.3)]"
              />
            ))}
          </div>
        </motion.div>

        <motion.div
          className="relative z-10 mx-auto grid w-full max-w-[115rem] items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(32rem,45rem)] lg:gap-20"
          variants={cardsStagger}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.22 }}
        >
          <motion.div className="max-w-[55rem]" variants={cardReveal}>
            <SectionEyebrow Icon={Heart}>Our Story</SectionEyebrow>
            <h2 className="font-display mt-8 flex flex-wrap gap-x-5 text-[clamp(3.4rem,5.4vw,6rem)] font-semibold leading-[0.96] text-[#f8f2e9]">
              <motion.span variants={headlineMain}>About</motion.span>
              <motion.span className="text-[#e7ad61]" variants={headlineAccent}>
                Upgrade Aprons.
              </motion.span>
            </h2>
            <motion.div
              className="my-9 h-[3px] w-16 origin-left bg-[#d6a25f]"
              variants={lineReveal}
            />
            <motion.p
              className="max-w-[51rem] text-lg leading-8 text-[#d8cabc] sm:text-xl"
              variants={fadeUp}
            >
              For more than 40 years, Crispin has worked in upholstery,
              learning the behavior of leather, the value of strong stitching,
              and the details that make useful pieces last while finding ways
              to repurpose genuine leather remnants.
            </motion.p>
            <motion.p
              className="mt-7 max-w-[51rem] text-lg leading-8 text-[#d8cabc] sm:text-xl"
              variants={fadeUp}
            >
              Today, that experience lives in every Upgrade Apron. Each piece
              is thoughtfully designed, handcrafted on Whidbey Island, and
              built from leather with a past.
            </motion.p>
            <motion.div className="mt-10 inline-flex" variants={fadeUp}>
              <a
                href="#custom-orders"
                className="inline-flex min-h-[4.25rem] min-w-72 items-center justify-center gap-4 rounded-lg bg-[linear-gradient(135deg,#efbd75,#c7802e)] px-8 text-base font-semibold text-black shadow-[0_0_34px_rgba(214,162,95,0.28)] transition duration-200 hover:-translate-y-0.5"
              >
                <Sparkles size={22} aria-hidden="true" />
                Start a Custom Apron
              </a>
            </motion.div>
          </motion.div>

          <motion.div
            className="relative overflow-hidden rounded-lg border border-white/18 bg-[#0e0906]/66 shadow-[0_28px_70px_rgba(0,0,0,0.32)] backdrop-blur-md"
            variants={cardReveal}
          >
            <div className="relative grid items-center gap-8 p-8 sm:grid-cols-[12rem_1fr] sm:p-10 lg:p-12">
              <div className="relative aspect-square overflow-hidden rounded-full border border-[#d6a25f]/80">
                <Image
                  src="/images/story-family-cropped.png"
                  alt="Crispin and family wearing handmade Upgrade Aprons."
                  fill
                  sizes="12rem"
                  className="object-cover object-[50%_42%]"
                />
              </div>
              <div>
                <p className="text-[0.8rem] font-bold uppercase tracking-[0.24em] text-[#e7ad61]">
                  Made By
                </p>
                <h3 className="font-display mt-4 text-4xl font-semibold leading-none text-white sm:text-5xl">
                  Crispin
                </h3>
                <div className="my-6 h-px w-16 bg-[#d6a25f]" />
                <p className="text-lg leading-7 text-[#d8cabc]">
                  Upholstery knowledge, leather craft, and direct customer
                  feedback shaped into practical everyday gear.
                </p>
              </div>
            </div>

            <motion.div
              className="grid gap-8 border-t border-white/12 p-8 sm:grid-cols-3 sm:p-10"
              variants={cardsStagger}
            >
              {aboutValues.map((value) => (
                <AboutValue key={value.title} value={value} />
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      <section
        id="aprons"
        className="relative isolate overflow-hidden bg-[#080503] px-6 py-24 sm:px-10 lg:px-12 lg:py-32"
      >
        <Image
          src="/images/story-leather-bg.png"
          alt=""
          fill
          sizes="100vw"
          className="pointer-events-none -z-10 object-cover object-center opacity-60"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,4,3,0.94)_0%,rgba(10,6,3,0.82)_48%,rgba(5,4,3,0.96)_100%)]"
          aria-hidden="true"
        />
        <motion.div
          className="mx-auto w-full max-w-[112rem]"
          variants={heroIntro}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.18 }}
        >
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1fr] lg:items-end">
            <motion.div variants={fadeUp}>
              <SectionEyebrow Icon={Hammer}>Aprons</SectionEyebrow>
              <h2 className="font-display mt-7 text-5xl font-semibold leading-[0.96] text-[#f8f2e9] sm:text-6xl lg:text-7xl">
                Built for the way you work.
              </h2>
            </motion.div>
            <motion.div variants={fadeUp}>
              <div className="h-[3px] w-16 bg-[#d6a25f]" />
              <p className="mt-7 max-w-[48rem] text-lg leading-8 text-[#d8cabc] sm:text-xl">
                Upgrade Aprons are practical first, then refined until they
                feel personal. Each build balances leather weight, pocket
                layout, color, hardware, and movement for the work it needs to
                support.
              </p>
            </motion.div>
          </div>

          <motion.div
            className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4"
            variants={cardsStagger}
          >
            {apronCollections.map((collection) => (
              <CollectionCard
                collection={collection}
                key={collection.title}
              />
            ))}
          </motion.div>
        </motion.div>
      </section>

      <section
        id="process"
        className="relative isolate overflow-hidden bg-[#050403] px-6 py-24 sm:px-10 lg:px-12 lg:py-32"
      >
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_26%,rgba(214,162,95,0.12),transparent_28%),linear-gradient(180deg,#050403_0%,#0b0704_48%,#050403_100%)]"
          aria-hidden="true"
        />
        <motion.div
          className="mx-auto grid w-full max-w-[112rem] gap-14 lg:grid-cols-[minmax(30rem,0.82fr)_1fr] lg:items-center lg:gap-20"
          variants={cardsStagger}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.18 }}
        >
          <motion.div variants={cardReveal}>
            <SectionEyebrow Icon={Scissors}>Process</SectionEyebrow>
            <h2 className="font-display mt-7 max-w-[13ch] text-5xl font-semibold leading-[0.96] text-[#f8f2e9] sm:text-6xl lg:text-7xl">
              From useful material to daily gear.
            </h2>
            <div className="my-8 h-[3px] w-16 bg-[#d6a25f]" />
            <p className="text-lg leading-8 text-[#d8cabc] sm:text-xl">
              The process starts with the person wearing the apron. After that,
              the leather, pockets, straps, and proportions are chosen to make
              the piece feel right in actual use.
            </p>
            <div className="relative mt-10 aspect-[1.12] overflow-hidden rounded-lg border border-white/16 shadow-[0_24px_62px_rgba(0,0,0,0.34)]">
              <Image
                src="/images/story-customer.jpg"
                alt="An Upgrade Aprons customer holding a custom leather apron at a market booth."
                fill
                sizes="(min-width: 1024px) 38vw, 100vw"
                className="object-cover object-[50%_42%]"
              />
            </div>
          </motion.div>

          <motion.div
            className="grid gap-8 rounded-lg border border-white/16 bg-[#0e0906]/72 p-7 shadow-[0_24px_62px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-10 lg:p-12"
            variants={cardsStagger}
          >
            {processSteps.map((step) => (
              <ProcessStep key={step.step} step={step} />
            ))}
          </motion.div>
        </motion.div>
      </section>

      <section
        id="markets"
        className="relative isolate overflow-hidden bg-[#080503] px-6 py-24 sm:px-10 lg:px-12 lg:py-32"
      >
        <Image
          src="/images/story-leather-bg.png"
          alt=""
          fill
          sizes="100vw"
          className="pointer-events-none -z-10 object-cover object-center opacity-60"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,4,3,0.98)_0%,rgba(5,4,3,0.78)_48%,rgba(5,4,3,0.96)_100%)]"
          aria-hidden="true"
        />
        <motion.div
          className="mx-auto grid w-full max-w-[112rem] gap-14 lg:grid-cols-[1fr_0.92fr] lg:items-center lg:gap-20"
          variants={cardsStagger}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.18 }}
        >
          <motion.div
            className="grid gap-6 sm:grid-cols-2"
            variants={cardsStagger}
          >
            <motion.div
              className="relative aspect-[1.16] overflow-hidden rounded-lg border border-[#d6a25f]/70 shadow-[0_24px_62px_rgba(0,0,0,0.34)] sm:col-span-2"
              variants={cardReveal}
            >
              <Image
                src="/images/story-family-cropped.png"
                alt="The Upgrade Aprons team wearing handmade leather aprons."
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover object-[50%_40%]"
              />
            </motion.div>
            <motion.div
              className="relative aspect-[1.08] overflow-hidden rounded-lg border border-white/16 shadow-[0_20px_48px_rgba(0,0,0,0.3)]"
              variants={cardReveal}
            >
              <Image
                src="/images/story-market.jpg"
                alt="A customer speaking with Crispin at the Upgrade Aprons market booth."
                fill
                sizes="(min-width: 1024px) 24vw, 50vw"
                className="object-cover object-center"
              />
            </motion.div>
            <motion.div
              className="relative aspect-[1.08] overflow-hidden rounded-lg border border-white/16 shadow-[0_20px_48px_rgba(0,0,0,0.3)]"
              variants={cardReveal}
            >
              <Image
                src="/images/story-customer.jpg"
                alt="A custom leather apron displayed by a customer at the market booth."
                fill
                sizes="(min-width: 1024px) 24vw, 50vw"
                className="object-cover object-center"
              />
            </motion.div>
          </motion.div>

          <motion.div variants={cardReveal}>
            <SectionEyebrow Icon={Heart}>Whidbey Made</SectionEyebrow>
            <h2 className="font-display mt-7 text-5xl font-semibold leading-[0.96] text-[#f8f2e9] sm:text-6xl lg:text-7xl">
              Tested in person. Refined by real work.
            </h2>
            <div className="my-8 h-[3px] w-16 bg-[#d6a25f]" />
            <p className="text-lg leading-8 text-[#d8cabc] sm:text-xl">
              Market days keep the craft honest. People handle the leather,
              try on the fit, talk through pocket needs, and shape what the
              next run of aprons becomes.
            </p>
            <motion.blockquote
              className="font-display mt-10 border-l border-[#d6a25f] pl-7 text-3xl font-medium leading-tight text-white sm:text-4xl"
              variants={fadeUp}
            >
              Thoughtful enough to feel special, practical enough to put to
              work.
            </motion.blockquote>
            <motion.div
              className="mt-12 grid gap-8 sm:grid-cols-3"
              variants={cardsStagger}
            >
              {marketStats.map((stat) => (
                <MarketStat key={stat.label} stat={stat} />
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      <section
        id="gallery"
        className="relative isolate flex min-h-screen items-center overflow-hidden bg-[#050403] px-6 py-24 sm:px-10 lg:px-12 lg:py-32"
      >
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_38%,rgba(43,140,134,0.13),transparent_30%),radial-gradient(circle_at_82%_22%,rgba(185,84,56,0.12),transparent_26%),linear-gradient(180deg,#050403_0%,#090604_46%,#050403_100%)]"
          aria-hidden="true"
        />
        <motion.div
          className="mx-auto w-full max-w-[110rem]"
          variants={heroIntro}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div
            className="mx-auto mb-14 max-w-[52rem] text-center sm:mb-20"
            variants={fadeUp}
          >
            <SectionEyebrow Icon={Palette}>Gallery</SectionEyebrow>
            <h2 className="font-display mt-7 text-[clamp(3.1rem,4.8vw,5.5rem)] font-semibold leading-[0.96] text-[#f8f2e9]">
              Aprons with their own history.
            </h2>
            <div className="mx-auto my-7 h-[3px] w-16 bg-[#d6a25f]" />
            <p className="text-lg leading-8 text-[#d8cabc] sm:text-xl">
              Browse the core work visually: apron builds, customer pieces,
              market favorites, and the handmade process behind them.
            </p>
          </motion.div>

          <div className="grid items-center gap-5 sm:grid-cols-[4rem_minmax(0,1fr)_4rem] lg:gap-8">
            <button
              type="button"
              aria-label="Previous gallery items"
              className="hidden size-16 items-center justify-center rounded-full border border-[#d6a25f]/80 bg-black/28 text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a25f]/12 sm:inline-flex"
              onClick={() => moveGallery(-1)}
            >
              <ArrowLeft size={24} aria-hidden="true" />
            </button>

            <motion.div
              key={`${galleryIndex}-${galleryItemsPerView}`}
              className="grid gap-6 sm:col-start-2 md:grid-cols-2 xl:grid-cols-3"
              variants={cardsStagger}
              initial={reduceMotion ? false : "hidden"}
              animate={reduceMotion ? undefined : "visible"}
            >
              {visibleGalleryItems.map((item) => (
                <motion.article
                  key={item.title}
                  className="relative flex min-h-[36rem] flex-col overflow-hidden rounded-lg border border-white/18 bg-[#0e0906]/70 p-6 shadow-[0_24px_62px_rgba(0,0,0,0.34)] backdrop-blur-md"
                  variants={cardReveal}
                >
                  <div className="relative mb-7 aspect-[1.08] overflow-hidden rounded-md">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(min-width: 1280px) 30vw, (min-width: 768px) 44vw, 100vw"
                      className="object-cover object-center"
                    />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <p
                      className="text-xs font-bold uppercase tracking-[0.18em]"
                      style={{ color: item.accent } as CSSProperties}
                    >
                      {item.category}
                    </p>
                    <h3 className="font-display mt-4 text-4xl font-semibold leading-none text-white">
                      {item.title}
                    </h3>
                    <div
                      className="my-6 h-px w-14"
                      style={{ backgroundColor: item.accent } as CSSProperties}
                    />
                    <p className="text-base leading-7 text-[#d8cabc]">
                      {item.copy}
                    </p>
                    <div className="mt-auto grid grid-cols-2 gap-5 border-t border-white/12 pt-6 text-sm">
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-[0.14em] text-[#e7ad61]">
                          Material
                        </span>
                        <strong className="mt-2 block font-medium text-white/86">
                          Repurposed Genuine Top-Grain Leather
                        </strong>
                      </div>
                      <div className="border-l border-white/18 pl-5">
                        <span className="block text-xs font-bold uppercase tracking-[0.14em] text-[#e7ad61]">
                          Finish
                        </span>
                        <strong className="mt-2 block font-medium text-white/86">
                          Handmade
                        </strong>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>

            <button
              type="button"
              aria-label="Next gallery items"
              className="hidden size-16 items-center justify-center rounded-full border border-[#d6a25f]/80 bg-black/28 text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a25f]/12 sm:inline-flex"
              onClick={() => moveGallery(1)}
            >
              <ArrowRight size={24} aria-hidden="true" />
            </button>
          </div>

          <div
            className="mt-8 flex justify-center gap-3"
            aria-label="Gallery carousel position"
          >
            {galleryItems.map((item, index) => (
              <button
                type="button"
                key={item.title}
                aria-label={`Show ${item.title}`}
                aria-current={galleryIndex === index ? "page" : undefined}
                className={`size-3 rounded-full transition duration-200 ${
                  galleryIndex === index
                    ? "bg-[#d6a25f] shadow-[0_0_18px_rgba(214,162,95,0.42)]"
                    : "bg-white/24 hover:bg-[#d6a25f]/70"
                }`}
                onClick={() => setGalleryIndex(index)}
              />
            ))}
          </div>
        </motion.div>
      </section>

      <section
        id="custom-orders"
        className="relative isolate overflow-hidden px-6 py-24 sm:px-10 lg:px-12 lg:py-32"
      >
        <Image
          src="/images/story-leather-bg.png"
          alt=""
          fill
          sizes="100vw"
          className="pointer-events-none -z-10 object-cover object-center opacity-70"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,4,3,0.96)_0%,rgba(5,4,3,0.78)_42%,rgba(5,4,3,0.94)_100%)]"
          aria-hidden="true"
        />
        <motion.div
          className="mx-auto grid max-w-[100rem] gap-12 rounded-lg border border-white/18 bg-[#0e0906]/68 p-8 shadow-[0_28px_70px_rgba(0,0,0,0.3)] backdrop-blur-md sm:p-12 lg:grid-cols-[1fr_0.78fr] lg:p-16"
          variants={cardsStagger}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.2 }}
        >
          <div>
            <SectionEyebrow Icon={Sparkles}>Custom Orders</SectionEyebrow>
            <h2 className="font-display mt-7 max-w-[12ch] text-[clamp(3rem,5vw,5.6rem)] font-semibold leading-[0.96] text-white">
              Build the apron around the work.
            </h2>
          </div>
          <div className="self-end">
            <motion.p
              className="text-lg leading-8 text-[#d8cabc] sm:text-xl"
              variants={fadeUp}
            >
              Choose the color direction, pocket layout, and functional details
              that fit your day. Upgrade Aprons can be made for cooks, makers,
              florists, artists, gardeners, and tradespeople who need tools
              close at hand.
            </motion.p>
            <motion.a
              href="mailto:upgrade@whidbey.com?subject=Custom%20Upgrade%20Apron%20Order"
              className="mt-9 inline-flex min-h-16 min-w-64 items-center justify-center gap-4 rounded-md bg-[linear-gradient(135deg,#efbd75,#c7802e)] px-8 text-sm font-semibold uppercase tracking-[0.18em] !text-[#050403] shadow-[0_0_30px_rgba(214,162,95,0.28)] transition duration-200 hover:-translate-y-0.5"
              variants={fadeUp}
            >
              <Mail size={22} aria-hidden="true" />
              Contact for Custom
            </motion.a>
          </div>
        </motion.div>

        <motion.div
          className="mx-auto mt-14 grid max-w-[100rem] gap-12 lg:grid-cols-[0.72fr_1fr] lg:items-start"
          variants={cardsStagger}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div variants={fadeUp}>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e7ad61]">
              What to expect
            </p>
            <h2 className="font-display mt-5 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Simple details up front make the finished apron better.
            </h2>
            <p className="mt-6 text-base leading-7 text-[#d8cabc] sm:text-lg">
              Share the intended use, rough color direction, wearer height, and
              any tools or tasks the apron needs to support. From there, the
              build can stay practical while still feeling like a personal
              piece.
            </p>
          </motion.div>

          <motion.div
            className="grid gap-0 rounded-lg border border-white/16 bg-[#0e0906]/62 px-7 shadow-[0_24px_62px_rgba(0,0,0,0.26)] backdrop-blur-md sm:px-10"
            variants={cardsStagger}
          >
            {faqItems.map((item) => (
              <FaqItem key={item.question} item={item} />
            ))}
          </motion.div>
        </motion.div>
      </section>

      <footer
        id="contact"
        className="relative overflow-hidden border-t border-[#d6a25f]/30 bg-[#050403] px-6 py-14 sm:px-10 lg:px-12"
      >
        <div className="mx-auto grid max-w-[110rem] gap-10 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div>
            <a
              href="#top"
              className="font-display inline-flex text-3xl font-medium uppercase tracking-[0.22em] text-white"
            >
              Upgrade Aprons
            </a>
            <div className="my-6 h-px w-20 bg-[#d6a25f]" />
            <p className="max-w-md text-base leading-7 text-[#d8cabc]">
              Handmade from repurposed genuine top-grain leather on Whidbey
              Island.
            </p>
          </div>
          <nav
            className="grid gap-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/76"
            aria-label="Footer navigation"
          >
            <a className="transition hover:text-[#e7ad61]" href="#about">
              About
            </a>
            <a className="transition hover:text-[#e7ad61]" href="#aprons">
              Aprons
            </a>
            <a className="transition hover:text-[#e7ad61]" href="#process">
              Process
            </a>
            <a className="transition hover:text-[#e7ad61]" href="#gallery">
              Gallery
            </a>
            <a
              className="transition hover:text-[#e7ad61]"
              href="#custom-orders"
            >
              Custom Orders
            </a>
          </nav>
          <div className="md:text-right">
            <p className="text-sm uppercase tracking-[0.22em] text-[#e7ad61]">
              Contact
            </p>
            <a
              href="mailto:upgrade@whidbey.com"
              className="font-display mt-4 inline-block text-3xl font-semibold text-white transition hover:text-[#e7ad61]"
            >
              upgrade@whidbey.com
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

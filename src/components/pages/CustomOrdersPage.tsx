"use client";

import Image from "next/image";
import Link from "next/link";
import {
  MessageSquare,
  Palette,
  Ruler,
  Scissors,
  Sparkles,
} from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { CustomApronDesigner } from "@/components/CustomApronDesigner";
import { customFaqItems, processSteps } from "@/lib/site-data";

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

export function CustomOrdersPage() {
  const reduceMotion = useReducedMotion();

  return (
    <main className="bg-[#050403] text-[#f7f1e8]">
      <section className="relative isolate overflow-hidden px-6 pb-20 pt-36 sm:px-10 sm:pt-40 lg:px-12 lg:pb-28 lg:pt-44">
        <Image
          alt=""
          aria-hidden="true"
          className="splash-hero-image pointer-events-none -z-10 object-cover object-[62%_center]"
          fill
          priority
          sizes="100vw"
          src="/images/apron-splash-background.png"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 splash-hero-fade"
        />

        <motion.div
          animate={reduceMotion ? undefined : "visible"}
          className="mx-auto grid max-w-[112rem] gap-14 lg:grid-cols-[0.95fr_0.8fr] lg:items-center lg:gap-20"
          initial={reduceMotion ? false : "hidden"}
          variants={stagger}
        >
          <motion.div className="splash-hero-copy" variants={fadeUp}>
            <p className="inline-flex items-center gap-4 text-[0.82rem] font-bold uppercase tracking-[0.24em] text-[#e7ad61] sm:text-[0.95rem]">
              <Sparkles size={30} strokeWidth={1.45} aria-hidden="true" />
              <span>Custom Orders</span>
            </p>
            <h1 className="font-display mt-7 text-6xl font-semibold leading-[0.92] text-[#f8f2e9] sm:text-7xl lg:text-8xl">
              Design the apron around
              <span className="block text-[#e7ad61]">the work.</span>
            </h1>
            <div className="my-8 h-[3px] w-16 bg-[#d6a25f]" />
            <p className="max-w-[43rem] text-lg leading-8 text-[#d8cabc] sm:text-xl">
              Choose the apron base, place the pockets, mark center stitches,
              and send the layout with your contact details.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <a
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-md bg-[linear-gradient(135deg,#efbd75,#c7802e)] px-7 text-sm font-semibold uppercase tracking-[0.18em] !text-[#050403] shadow-[0_0_30px_rgba(214,162,95,0.24)] transition duration-200 hover:-translate-y-0.5"
                href="#designer"
              >
                <Scissors size={18} aria-hidden="true" />
                Start Design
              </a>
              <Link
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-md border border-[#d6a25f]/70 px-7 text-sm font-semibold uppercase tracking-[0.18em] text-[#e7ad61] transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a25f]/10 hover:text-white"
                href="/contact"
              >
                <MessageSquare size={18} aria-hidden="true" />
                Message Directly
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="rounded-lg border border-white/16 bg-[#0e0906]/78 p-7 shadow-[0_28px_70px_rgba(0,0,0,0.34)] backdrop-blur-md sm:p-9"
            variants={cardReveal}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#e7ad61]">
              Design Options
            </p>
            <div className="mt-6 grid gap-4">
              {[
                {
                  label: "Apron bases",
                  value: "X-Back, Standard Large, Standard Small, Half-Apron",
                },
                {
                  label: "Pocket sizes",
                  value: 'Top 5 x 5.5, Front 16 x 8, Utility 3.5 x 5',
                },
                {
                  label: "Build notes",
                  value: "Use case, wearer height, contact details, and custom notes",
                },
              ].map((item) => (
                <div
                  className="border-t border-white/12 pt-4 first:border-t-0 first:pt-0"
                  key={item.label}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e7ad61]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-base leading-7 text-[#d8cabc]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section
        className="relative isolate overflow-hidden px-6 py-24 sm:px-10 lg:px-12 lg:py-32"
        id="designer"
      >
        <Image
          alt=""
          aria-hidden="true"
          className="pointer-events-none -z-10 object-cover object-center opacity-70"
          fill
          sizes="100vw"
          src="/images/story-leather-bg.png"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,4,3,0.94)_0%,rgba(5,4,3,0.82)_45%,rgba(5,4,3,0.96)_100%)]"
        />

        <div className="mx-auto mb-12 max-w-[116rem]">
          <motion.p
            className="inline-flex items-center gap-4 text-[0.82rem] font-bold uppercase tracking-[0.24em] text-[#e7ad61] sm:text-[0.95rem]"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            transition={{ duration: 0.7, ease: easeOut }}
            viewport={{ once: true, amount: 0.2 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          >
            <Ruler size={30} strokeWidth={1.45} aria-hidden="true" />
            <span>Apron Designer</span>
          </motion.p>
          <motion.h2
            className="font-display mt-7 max-w-5xl text-5xl font-semibold leading-[0.96] text-white sm:text-6xl lg:text-7xl"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            transition={{ duration: 0.82, ease: easeOut, delay: 0.05 }}
            viewport={{ once: true, amount: 0.2 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          >
            Lay out a working draft before the build begins.
          </motion.h2>
          <motion.p
            className="mt-5 max-w-3xl text-base leading-7 text-[#d8cabc] sm:text-lg"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            transition={{ duration: 0.82, ease: easeOut, delay: 0.1 }}
            viewport={{ once: true, amount: 0.2 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          >
            Certain leathers, colors, and designs move in and out of stock, so
            the final build uses available leathers while staying as close to
            the submitted design as possible.
          </motion.p>
        </div>

        <CustomApronDesigner />
      </section>

      <section className="relative isolate overflow-hidden px-6 py-24 sm:px-10 lg:px-12 lg:py-32">
        <Image
          alt=""
          aria-hidden="true"
          className="pointer-events-none -z-10 object-cover object-center opacity-65"
          fill
          sizes="100vw"
          src="/images/story-leather-bg.png"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,4,3,0.96)_0%,rgba(5,4,3,0.84)_48%,rgba(5,4,3,0.96)_100%)]"
        />
        <motion.div
          className="mx-auto grid max-w-[112rem] gap-14 lg:grid-cols-[0.78fr_1fr] lg:items-start lg:gap-20"
          initial={reduceMotion ? false : "hidden"}
          variants={stagger}
          viewport={{ once: true, amount: 0.18 }}
          whileInView={reduceMotion ? undefined : "visible"}
        >
          <motion.div variants={fadeUp}>
            <p className="inline-flex items-center gap-4 text-[0.82rem] font-bold uppercase tracking-[0.24em] text-[#e7ad61] sm:text-[0.95rem]">
              <Scissors size={30} strokeWidth={1.45} aria-hidden="true" />
              <span>Process</span>
            </p>
            <h2 className="font-display mt-7 text-5xl font-semibold leading-[0.96] text-white sm:text-6xl lg:text-7xl">
              A practical path from draft to apron.
            </h2>
            <div className="my-8 h-[3px] w-16 bg-[#d6a25f]" />
            <p className="text-lg leading-8 text-[#d8cabc] sm:text-xl">
              The design board gives Crispin a starting layout. Certain
              leathers, colors, and designs move in and out of stock, so the
              final build uses available leathers while staying as close to the
              submitted design as possible.
            </p>
          </motion.div>

          <motion.div className="grid gap-6 md:grid-cols-2" variants={stagger}>
            {processSteps.map((step) => (
              <motion.article
                className="rounded-lg border border-white/16 bg-[#0e0906]/72 p-7 shadow-[0_24px_62px_rgba(0,0,0,0.28)] backdrop-blur-md"
                key={step.step}
                variants={cardReveal}
              >
                <strong className="font-display text-5xl font-semibold leading-none text-[#e7ad61]">
                  {step.step}
                </strong>
                <h3 className="font-display mt-5 text-3xl font-semibold leading-none text-white">
                  {step.title}
                </h3>
                <p className="mt-5 text-base leading-7 text-[#d8cabc]">
                  {step.copy}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <section className="bg-[#050403] px-6 py-24 sm:px-10 lg:px-12 lg:py-32">
        <motion.div
          className="mx-auto grid max-w-[100rem] gap-10 lg:grid-cols-[0.72fr_1fr] lg:items-start"
          initial={reduceMotion ? false : "hidden"}
          variants={stagger}
          viewport={{ once: true, amount: 0.2 }}
          whileInView={reduceMotion ? undefined : "visible"}
        >
          <motion.div variants={fadeUp}>
            <p className="inline-flex items-center gap-4 text-[0.82rem] font-bold uppercase tracking-[0.24em] text-[#e7ad61] sm:text-[0.95rem]">
              <Ruler size={30} strokeWidth={1.45} aria-hidden="true" />
              <span>Details</span>
            </p>
            <h2 className="font-display mt-7 text-5xl font-semibold leading-[0.96] text-white sm:text-6xl">
              Notes make the design workable.
            </h2>
          </motion.div>

          <motion.div
            className="rounded-lg border border-white/16 bg-[#0e0906]/72 px-7 shadow-[0_24px_62px_rgba(0,0,0,0.28)] backdrop-blur-md sm:px-10"
            variants={stagger}
          >
            {customFaqItems.map((item) => (
              <motion.article
                className="border-t border-white/14 py-7 first:border-t-0"
                key={item.question}
                variants={fadeUp}
              >
                <h3 className="font-display text-2xl font-semibold leading-tight text-white">
                  {item.question}
                </h3>
                <p className="mt-3 text-base leading-7 text-[#d8cabc]">
                  {item.answer}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </motion.div>

        <div className="mx-auto mt-14 flex max-w-[100rem] flex-wrap gap-4">
          <Link
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-md border border-[#d6a25f]/70 px-6 text-sm font-semibold uppercase tracking-[0.16em] text-[#e7ad61] transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a25f]/10 hover:text-white"
            href="/products"
          >
            <Palette size={18} aria-hidden="true" />
            Browse Aprons
          </Link>
          <Link
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-md border border-[#d6a25f]/70 px-6 text-sm font-semibold uppercase tracking-[0.16em] text-[#e7ad61] transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a25f]/10 hover:text-white"
            href="/contact"
          >
            <MessageSquare size={18} aria-hidden="true" />
            Message Directly
          </Link>
        </div>
      </section>
    </main>
  );
}

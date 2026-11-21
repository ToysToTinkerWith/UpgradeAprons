"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Hammer,
  Heart,
  Recycle,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { storyCards } from "@/lib/site-data";

const easeOut = [0.22, 1, 0.36, 1] as const;

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.95, ease: easeOut },
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

const storyIcons: LucideIcon[] = [Hammer, Recycle];

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

export function AboutPage() {
  const reduceMotion = useReducedMotion();

  return (
    <main className="bg-[#050403] text-[#f7f1e8]">
      <section className="relative isolate flex min-h-screen flex-col justify-between overflow-hidden px-6 pb-16 pt-36 sm:px-10 sm:pt-40 lg:px-12 lg:pt-44">
        <Image
          src="/images/story-leather-bg.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="pointer-events-none -z-10 object-cover object-center"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_62%_20%,rgba(214,162,95,0.15),transparent_30%),linear-gradient(90deg,rgba(5,4,3,0.96)_0%,rgba(5,4,3,0.72)_44%,rgba(5,4,3,0.9)_100%)]"
          aria-hidden="true"
        />

        <motion.div
          className="relative z-10 max-w-[58rem]"
          variants={stagger}
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
        >
          <motion.h1
            className="font-display text-6xl font-semibold leading-[0.92] text-[#f8f2e9] sm:text-7xl lg:text-8xl"
            variants={fadeUp}
          >
            Rooted in
            <span className="block text-[#e7ad61]">craft.</span>
          </motion.h1>
          <motion.div className="my-8 h-[3px] w-16 bg-[#d6a25f]" variants={fadeUp} />
          <motion.p
            className="max-w-[43rem] text-lg leading-8 text-[#d8cabc] sm:text-xl"
            variants={fadeUp}
          >
            Upgrade Aprons began with upholstery experience and a clear
            standard: useful genuine leather goods should be strong,
            comfortable, distinctive, and made by hands that understand the
            material.
          </motion.p>
        </motion.div>

        <div className="relative z-10 mt-14 grid gap-10 lg:grid-cols-[1fr_26rem] lg:items-stretch">
          <motion.div
            className="grid gap-6 md:grid-cols-2"
            variants={stagger}
            initial={reduceMotion ? false : "hidden"}
            whileInView={reduceMotion ? undefined : "visible"}
            viewport={{ once: true, amount: 0.2 }}
          >
            {storyCards.map((card, index) => {
              const Icon = storyIcons[index] ?? Heart;

              return (
                <motion.article
                  className="rounded-lg border border-white/16 bg-[#0e0906]/72 p-7 shadow-[0_24px_62px_rgba(0,0,0,0.3)] backdrop-blur-md sm:p-9"
                  key={card.title}
                  variants={cardReveal}
                >
                  <div className="mb-7 inline-flex size-14 items-center justify-center rounded-full border border-[#d6a25f]/80 text-[#e7ad61]">
                    <Icon size={28} strokeWidth={1.35} aria-hidden="true" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e7ad61]">
                    {card.eyebrow}
                  </p>
                  <h2 className="font-display mt-4 text-4xl font-semibold leading-none text-white">
                    {card.title}
                  </h2>
                  <div className="my-6 h-px w-14 bg-[#d6a25f]" />
                  {card.copy.map((copy) => (
                    <p
                      className="mt-4 text-base leading-7 text-[#d8cabc]"
                      key={copy}
                    >
                      {copy}
                    </p>
                  ))}
                </motion.article>
              );
            })}
          </motion.div>

          <motion.aside
            className="rounded-lg border border-[#d6a25f]/45 bg-[#0e0906]/76 p-8 shadow-[0_24px_62px_rgba(0,0,0,0.32)] backdrop-blur-md"
            initial={reduceMotion ? false : { opacity: 0, x: 26 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9, ease: easeOut }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e7ad61]">
              Maker
            </p>
            <h2 className="font-display mt-4 text-5xl font-semibold leading-none text-white">
              Crispin T. Roberts
            </h2>
            <div className="my-7 h-px w-16 bg-[#d6a25f]" />
            <div className="relative mb-7 aspect-square overflow-hidden rounded-full border border-[#d6a25f]/80">
              <Image
                src="/images/story-family-cropped.png"
                alt="Crispin and family wearing Upgrade Aprons."
                fill
                sizes="22rem"
                className="object-cover object-[50%_42%]"
              />
            </div>
            <p className="text-base leading-7 text-[#d8cabc]">
              Four decades of furniture upholstery experience, translated into
              genuine leather aprons that are durable, functional, and
              intentionally personal.
            </p>
          </motion.aside>
        </div>
      </section>

      <section className="relative isolate overflow-hidden px-6 py-24 sm:px-10 lg:px-12 lg:py-32">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_22%_22%,rgba(43,140,134,0.12),transparent_30%),linear-gradient(180deg,#050403_0%,#090604_48%,#050403_100%)]"
          aria-hidden="true"
        />
        <motion.div
          className="mx-auto grid max-w-[112rem] gap-14 lg:grid-cols-[0.92fr_1fr] lg:items-center lg:gap-20"
          variants={stagger}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div
            className="grid gap-6 sm:grid-cols-2"
            variants={stagger}
          >
            <motion.div
              className="relative aspect-[1.12] overflow-hidden rounded-lg border border-[#d6a25f]/70 shadow-[0_24px_62px_rgba(0,0,0,0.34)] sm:col-span-2"
              variants={cardReveal}
            >
              <Image
                src="/images/events/coupeville-arts-festival-2026/crispin-blue-apron-booth.jpg"
                alt="Crispin wearing a blue leather apron at the Coupeville Arts Festival booth."
                fill
                sizes="(min-width: 1024px) 48vw, 100vw"
                className="object-cover object-[50%_42%]"
              />
            </motion.div>
            <motion.div
              className="relative aspect-[1.08] overflow-hidden rounded-lg border border-white/16 shadow-[0_20px_48px_rgba(0,0,0,0.3)]"
              variants={cardReveal}
            >
              <Image
                src="/images/events/anacortes-arts-festival-2026/festival-booth-front.jpg"
                alt="The Upgrade Aprons booth at Anacortes Arts Festival."
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
                src="/images/events/coupeville-arts-festival-2026/customer-blue-yellow-apron.jpg"
                alt="A customer wearing a blue and yellow leather apron at Coupeville Arts Festival."
                fill
                sizes="(min-width: 1024px) 24vw, 50vw"
                className="object-cover object-[50%_18%]"
              />
            </motion.div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <SectionEyebrow Icon={ShieldCheck}>Founder Story</SectionEyebrow>
            <h2 className="font-display mt-7 text-5xl font-semibold leading-[0.96] text-[#f8f2e9] sm:text-6xl lg:text-7xl">
              Practical craft that keeps listening.
            </h2>
            <div className="my-8 h-[3px] w-16 bg-[#d6a25f]" />
            <p className="text-lg leading-8 text-[#d8cabc] sm:text-xl">
              Market conversations shape the work. Customers talk through fit,
              pockets, leather feel, color, and the jobs their apron needs to
              handle. That direct feedback keeps each build grounded in actual
              use.
            </p>
            <p className="mt-6 text-lg leading-8 text-[#d8cabc] sm:text-xl">
              The result is not a uniform product line. It is a small craft
              practice where every apron starts with useful material and ends
              as a piece with its own character.
            </p>
            <div className="mt-8 border-l-2 border-[#d6a25f] pl-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e7ad61]">
                Crispin&apos;s Background
              </p>
              <p className="mt-4 text-base leading-7 text-[#d8cabc] sm:text-lg">
                Having descended from generations of fellmongers and leather
                tanners from Wales and Scotland, Crispin came into the furniture
                industry serendipitously. After 40+ years reupholstering, he
                decided to repurpose genuine leather remnants and overage
                leather into aprons.
              </p>
              <p className="mt-4 text-base leading-7 text-[#d8cabc] sm:text-lg">
                The positive response has been rewarding as Upgrade Aprons
                endeavors to create a quality, stylish, practical, and
                long-lasting product that harkens back to a time when many
                trades utilized leather aprons, each one unique and made with
                care and love.
              </p>
            </div>
            <Link
              href="/events"
              className="mt-9 inline-flex min-h-14 items-center justify-center rounded-md bg-[linear-gradient(135deg,#efbd75,#c7802e)] px-8 text-sm font-semibold uppercase tracking-[0.18em] !text-[#050403] shadow-[0_0_28px_rgba(214,162,95,0.24)] transition duration-200 hover:-translate-y-0.5"
            >
              View Market Notes
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}

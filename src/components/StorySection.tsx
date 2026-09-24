"use client";

import Image from "next/image";
import { Hammer } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

const imageReveal: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.1,
    },
  },
};

const stitchMarks = Array.from({ length: 44 }, (_, index) => index);

type StoryImageProps = {
  src: string;
  alt: string;
  sizes: string;
  className: string;
  imageClassName: string;
};

function StoryImage({
  src,
  alt,
  sizes,
  className,
  imageClassName,
}: StoryImageProps) {
  return (
    <motion.div
      className={`relative overflow-hidden border border-[#d6a25f] bg-[#120c08] shadow-[0_18px_45px_rgba(0,0,0,0.42)] ${className}`}
      variants={imageReveal}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={`object-cover ${imageClassName}`}
      />
    </motion.div>
  );
}

function StoryIntro({ headingClassName }: { headingClassName: string }) {
  return (
    <>
      <motion.p
        className="text-[0.92rem] font-medium uppercase tracking-[0.34em] text-[#e7ad61]"
        variants={fadeUp}
      >
        Meet Crispin
      </motion.p>
      <motion.div className="mt-6 h-px w-16 bg-[#e7ad61]" variants={fadeUp} />
      <motion.h2
        className={`font-display mt-7 max-w-[12ch] font-medium leading-[0.98] text-white drop-shadow-[0_8px_26px_rgba(0,0,0,0.5)] ${headingClassName}`}
        variants={fadeUp}
        >
          Four decades of craft, made by hand.
        </motion.h2>
      </>
  );
}

function StoryLabel({ className = "mt-12" }: { className?: string }) {
  return (
    <motion.div className={className} variants={fadeUp}>
      <p className="text-[0.92rem] font-medium uppercase tracking-[0.34em] text-[#e7ad61]">
        Our Story
      </p>
      <div className="mt-4 h-px w-28 bg-[#e7ad61]" />
    </motion.div>
  );
}

function StoryStats({
  className,
  craftClassName,
}: {
  className: string;
  craftClassName: string;
}) {
  return (
    <motion.div className={className} variants={fadeUp}>
      <div className="text-center sm:text-left">
        <p className="font-display text-6xl font-medium leading-none text-[#c7802e]">
          40+
        </p>
        <p className="mt-4 text-[0.9rem] uppercase tracking-[0.34em] text-white">
          Years
        </p>
        <p className="mt-3 max-w-64 text-base leading-7 text-[#d8cabc]">
          Decades of experience in upholstery and leather craft.
        </p>
      </div>

      <div className={`border-[#c7802e]/60 text-center sm:text-left ${craftClassName}`}>
        <Hammer
          className="mx-auto text-[#c7802e] sm:mx-0"
          size={58}
          strokeWidth={1.3}
          aria-hidden="true"
        />
        <p className="mt-5 text-[0.9rem] uppercase tracking-[0.34em] text-white">
          Handcrafted
        </p>
        <p className="mt-3 max-w-72 text-base leading-7 text-[#d8cabc]">
          Made by hand, with care, attention, and intention.
        </p>
      </div>
    </motion.div>
  );
}

export function StorySection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="about"
      className="relative isolate overflow-hidden bg-[#090604] px-6 py-20 text-[#f7f1e8] sm:px-10 lg:px-12 lg:py-24"
      aria-label="Meet Crispin and the Upgrade Aprons story"
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
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_48%_42%,rgba(214,162,95,0.09),transparent_34%),linear-gradient(90deg,rgba(0,0,0,0.38)_0%,rgba(0,0,0,0.12)_48%,rgba(0,0,0,0.42)_100%)]"
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

      <div className="mx-auto hidden w-full max-w-[106rem] items-center gap-14 lg:grid lg:grid-cols-[1.06fr_0.94fr] lg:gap-20">
        <motion.div
          className="grid gap-6"
          variants={stagger}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.25 }}
        >
          <StoryImage
            src="/images/story-family-cropped.png"
            alt="Crispin and family wearing handmade Upgrade Aprons at a market booth."
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="aspect-[1.42]"
            imageClassName="object-[50%_42%]"
          />

          <div className="grid gap-6 sm:grid-cols-2">
            <StoryImage
              src="/images/story-market.jpg"
              alt="A customer speaking with Crispin at the Upgrade Aprons booth."
              sizes="(min-width: 1024px) 24vw, 100vw"
              className="aspect-[1.12]"
              imageClassName="object-[52%_46%]"
            />

            <StoryImage
              src="/images/story-customer.jpg"
              alt="Crispin and a customer holding a custom leather apron."
              sizes="(min-width: 1024px) 24vw, 100vw"
              className="aspect-[1.12]"
              imageClassName="object-[52%_40%]"
            />
          </div>
        </motion.div>

        <motion.div
          className="max-w-2xl"
          variants={stagger}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.35 }}
        >
          <StoryIntro headingClassName="text-7xl" />
          <motion.div
            className="mt-8 grid gap-6 text-lg leading-8 text-[#d8cabc]"
            variants={fadeUp}
          >
            <p>
              For more than 40 years, Crispin has worked in upholstery,
              learning the materials, techniques, and details that make
              something last while finding ways to repurpose genuine leather
              remnants.
            </p>
            <p>
              Today, that experience lives in every Upgrade Apron, thoughtfully
              designed and handcrafted on Whidbey Island.
            </p>
          </motion.div>

          <StoryLabel />

          <StoryStats
            className="mt-9 grid gap-8 sm:grid-cols-[0.9fr_1.1fr]"
            craftClassName="sm:border-l sm:pl-12"
          />
        </motion.div>
      </div>

      <motion.div
        className="mx-auto w-full max-w-3xl lg:hidden"
        variants={stagger}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.18 }}
      >
        <StoryIntro headingClassName="text-5xl sm:text-6xl" />

        <motion.div
          className="mt-8 grid gap-5 sm:grid-cols-[0.9fr_1.1fr] sm:items-center"
          variants={fadeUp}
        >
          <StoryImage
            src="/images/story-family-cropped.png"
            alt="Crispin and family wearing handmade Upgrade Aprons at a market booth."
            sizes="(min-width: 640px) 42vw, 100vw"
            className="aspect-[1.08] sm:aspect-[0.84]"
            imageClassName="object-[50%_42%]"
          />

          <p className="text-lg leading-8 text-[#d8cabc]">
            For more than 40 years, Crispin has worked in upholstery, learning
            the materials, techniques, and details that make something last
            while finding ways to repurpose genuine leather remnants.
          </p>
        </motion.div>

        <motion.div
          className="mt-8 grid gap-5 sm:grid-cols-[0.92fr_1.08fr] sm:items-center"
          variants={fadeUp}
        >
          <StoryImage
            src="/images/story-market.jpg"
            alt="A customer speaking with Crispin at the Upgrade Aprons booth."
            sizes="(min-width: 640px) 42vw, 100vw"
            className="aspect-[0.95] sm:aspect-[0.82]"
            imageClassName="object-[52%_46%]"
          />

          <p className="text-lg leading-8 text-[#d8cabc]">
            Today, that experience lives in every Upgrade Apron, thoughtfully
            designed and handcrafted on Whidbey Island.
          </p>
        </motion.div>

        <motion.div
          className="mt-10 grid gap-8 sm:grid-cols-[1.08fr_0.92fr] sm:items-end"
          variants={fadeUp}
        >
          <div>
            <StoryLabel className="mt-0" />
            <StoryStats
              className="mt-8 grid gap-8"
              craftClassName="border-t border-[#c7802e]/35 pt-8 sm:border-t-0 sm:pt-0"
            />
          </div>

          <StoryImage
            src="/images/story-customer.jpg"
            alt="Crispin and a customer holding a custom leather apron."
            sizes="(min-width: 640px) 42vw, 100vw"
            className="aspect-[0.92] sm:aspect-[0.78]"
            imageClassName="object-[52%_40%]"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}

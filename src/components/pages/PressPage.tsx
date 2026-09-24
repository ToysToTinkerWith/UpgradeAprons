"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  CalendarDays,
  ChevronDown,
  Images,
  MapPin,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";

const easeOut = [0.22, 1, 0.36, 1] as const;

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, ease: easeOut },
  },
};

const cardReveal: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.85, ease: easeOut },
  },
};

type EventPhoto = {
  src: string;
  alt: string;
  caption: string;
  objectPosition?: string;
  orientation?: "landscape" | "portrait";
};

type CraftEvent = {
  id: string;
  title: string;
  year: string;
  location: string;
  intro: string;
  notesEyebrow: string;
  detailTitle: string;
  details: string[];
  photos: EventPhoto[];
  previewCount: number;
};

const craftEvents: CraftEvent[] = [
  {
    id: "anacortes-arts-festival-2026",
    title: "Anacortes Arts Festival 2026",
    year: "2026",
    location: "Anacortes, WA",
    previewCount: 2,
    intro:
      "Upgrade Aprons brought Crispin's handmade genuine leather aprons to the festival with a booth full of leather options, customer conversations, try-ons, and custom build inspiration.",
    notesEyebrow: "Festival Notes",
    detailTitle: "Real feedback, real leather, real fit.",
    details: [
      "The Anacortes Arts Festival gave visitors a close look at handmade leather aprons in use: on display forms, on customers, and in direct conversation with Crispin.",
      "Pieces ranged from colorful half aprons to full working aprons with layered pockets, showing how genuine leather changes the character of every build.",
      "Crispin used the market setting to talk through real work needs, available leather, pocket placement, and the way a custom design can become a practical apron.",
    ],
    photos: [
      {
        src: "/images/events/anacortes-arts-festival-2026/festival-booth-front.jpg",
        alt: "The Upgrade Aprons booth at Anacortes Arts Festival 2026.",
        caption:
          "The Upgrade Aprons booth brought Crispin's craft into the festival street.",
        objectPosition: "center",
      },
      {
        src: "/images/events/anacortes-arts-festival-2026/teal-half-apron-display.jpg",
        alt: "A teal leather half apron displayed on a mannequin at the festival booth.",
        caption:
          "Colored half aprons demonstrated how genuine leather can be both practical and expressive.",
        objectPosition: "center 42%",
        orientation: "portrait",
      },
      {
        src: "/images/events/anacortes-arts-festival-2026/apron-customer-conversation.jpg",
        alt: "A customer wearing an Upgrade Apron while speaking with Crispin.",
        caption:
          "Visitors talked with Crispin about fit, strap feel, pockets, and leather options.",
        objectPosition: "center 38%",
        orientation: "portrait",
      },
      {
        src: "/images/events/anacortes-arts-festival-2026/custom-half-apron-customer.jpg",
        alt: "Crispin and a customer holding a custom leather half apron.",
        caption:
          "The booth made room for custom ideas, material comparisons, and finished-piece reactions.",
        objectPosition: "center 40%",
        orientation: "portrait",
      },
      {
        src: "/images/events/anacortes-arts-festival-2026/apron-guest-street.jpg",
        alt: "A festival guest wearing a leather apron while speaking with Crispin.",
        caption:
          "Seeing aprons on real people helped guests judge coverage, movement, and proportion.",
        objectPosition: "center 36%",
        orientation: "portrait",
      },
    ],
  },
  {
    id: "coupeville-arts-festival-2026",
    title: "Coupeville Arts Festival 2026",
    year: "2026",
    location: "Coupeville, WA",
    previewCount: 1,
    intro:
      "Upgrade Aprons set up at the Coupeville Arts Festival with bright leather builds, booth conversations, and customers trying aprons around the rack.",
    notesEyebrow: "Booth Notes",
    detailTitle: "Color, fit, and hands-on festival feedback.",
    details: [
      "At Coupeville, Crispin showed how color blocking and genuine leather can turn a hard-working apron into a unique piece with real presence.",
      "The booth gave customers a chance to step into finished aprons, compare strap feel, and see how pocket placement changes the way a piece sits and moves.",
      "Like every market day, the conversations stayed practical: available leather, durable hardware, comfortable fit, and custom ideas that can be built from materials currently in stock.",
    ],
    photos: [
      {
        src: "/images/events/coupeville-arts-festival-2026/crispin-blue-apron-booth.jpg",
        alt: "Crispin wearing a blue leather apron beside a mannequin at Coupeville Arts Festival 2026.",
        caption:
          "Crispin stood beside a display apron that showed the booth's bold color blocking and leather texture.",
        objectPosition: "center 42%",
      },
      {
        src: "/images/events/coupeville-arts-festival-2026/customer-blue-yellow-apron.jpg",
        alt: "A customer wearing a blue and yellow leather apron at Coupeville Arts Festival 2026.",
        caption:
          "A customer tried on a blue apron with yellow pockets, bringing the fit and color story to life.",
        objectPosition: "center 18%",
        orientation: "portrait",
      },
    ],
  },
];

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

function EventCard({
  event,
  isExpanded,
  onToggle,
  reduceMotion,
}: {
  event: CraftEvent;
  isExpanded: boolean;
  onToggle: (anchor: HTMLElement | null) => void;
  reduceMotion: boolean | null;
}) {
  const cardRef = useRef<HTMLElement | null>(null);
  const previewPhotos = event.photos.slice(0, event.previewCount);
  const detailsId = `${event.id}-details`;

  return (
    <motion.article
      ref={cardRef}
      className="w-full overflow-hidden rounded-lg border border-white/16 bg-[#0e0906]/82 shadow-[0_28px_70px_rgba(0,0,0,0.34)] backdrop-blur-md"
      variants={cardReveal}
    >
      <button
        type="button"
        className="group grid w-full gap-6 p-5 text-left transition duration-200 hover:bg-white/[0.035] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e7ad61] sm:p-7 lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.92fr)] lg:items-center lg:p-9"
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        onClick={() => onToggle(cardRef.current)}
      >
        <span
          className={
            previewPhotos.length > 1 ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"
          }
        >
          {previewPhotos.map((photo) => (
            <span
              className="relative block aspect-[1.16] overflow-hidden rounded-md border border-white/14 bg-black/30"
              key={photo.src}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(min-width: 1024px) 28vw, (min-width: 640px) 44vw, 100vw"
                className="object-contain"
                style={{ objectPosition: photo.objectPosition ?? "center" }}
              />
            </span>
          ))}
        </span>

        <span className="block">
          <span className="mb-4 flex flex-wrap gap-3">
            <span className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#d6a25f]/45 bg-[#d6a25f]/10 px-3 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[#e7ad61]">
              <CalendarDays size={15} aria-hidden="true" />
              {event.year}
            </span>
            <span className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/14 bg-white/[0.04] px-3 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[#d8cabc]">
              <MapPin size={15} aria-hidden="true" />
              {event.location}
            </span>
          </span>
          <span className="font-display block text-4xl font-semibold leading-none text-white sm:text-5xl">
            {event.title}
          </span>
          <span className="mt-5 block text-base leading-7 text-[#d8cabc] sm:text-lg">
            {event.intro}
          </span>
          <span className="mt-6 inline-flex min-h-12 items-center gap-3 rounded-md bg-[linear-gradient(135deg,#efbd75,#c7802e)] px-5 text-xs font-semibold uppercase tracking-[0.16em] !text-[#050403] shadow-[0_0_28px_rgba(214,162,95,0.24)] transition duration-200 group-hover:-translate-y-0.5">
            <Images size={17} aria-hidden="true" />
            {isExpanded ? "Close Event" : "View Event"}
            <ChevronDown
              size={18}
              className={`transition duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            id={detailsId}
            className="border-t border-white/14 px-5 py-7 sm:px-7 sm:py-8"
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.26, ease: "easeOut" }}
          >
            <div className="grid gap-8 lg:grid-cols-[0.62fr_1fr] lg:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e7ad61]">
                  {event.notesEyebrow}
                </p>
                <h2 className="font-display mt-4 text-4xl font-semibold leading-none text-white">
                  {event.detailTitle}
                </h2>
                <div className="my-6 h-px w-14 bg-[#d6a25f]" />
                {event.details.map((detail) => (
                  <p
                    className="mt-4 text-base leading-7 text-[#d8cabc]"
                    key={detail}
                  >
                    {detail}
                  </p>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {event.photos.map((photo, index) => (
                  <figure
                    className={index === 0 ? "sm:col-span-2" : undefined}
                    key={photo.src}
                  >
                    <div
                      className={`relative overflow-hidden rounded-md border border-white/14 bg-black/30 ${
                        index === 0
                          ? "aspect-[1.72]"
                          : photo.orientation === "portrait"
                            ? "aspect-[0.72]"
                            : "aspect-[1.05]"
                      }`}
                    >
                      <Image
                        src={photo.src}
                        alt={photo.alt}
                        fill
                        sizes={
                          index === 0
                            ? "(min-width: 1024px) 44vw, 100vw"
                            : "(min-width: 1024px) 22vw, (min-width: 640px) 44vw, 100vw"
                        }
                        className="object-contain"
                        style={{
                          objectPosition: photo.objectPosition ?? "center",
                        }}
                      />
                    </div>
                    <figcaption className="mt-3 text-sm leading-6 text-[#cdbdab]">
                      {photo.caption}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
}

export function PressPage() {
  const reduceMotion = useReducedMotion();
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const toggleEvent = (eventId: string, anchor: HTMLElement | null) => {
    const anchorTop = anchor?.getBoundingClientRect().top;

    setExpandedEventId((currentEventId) =>
      currentEventId === eventId ? null : eventId,
    );

    if (!anchor || anchorTop === undefined) {
      return;
    }

    let remainingFrames = 28;
    const preserveAnchorPosition = () => {
      if (!anchor.isConnected) {
        return;
      }

      const offset = anchor.getBoundingClientRect().top - anchorTop;

      if (Math.abs(offset) > 0.5) {
        window.scrollBy(0, offset);
      }

      remainingFrames -= 1;

      if (remainingFrames > 0) {
        requestAnimationFrame(preserveAnchorPosition);
      }
    };

    requestAnimationFrame(preserveAnchorPosition);
  };

  return (
    <main className="bg-[#050403] text-[#f7f1e8]">
      <section className="relative isolate min-h-screen overflow-hidden px-6 pb-16 pt-36 sm:px-10 sm:pb-20 sm:pt-40 lg:px-12 lg:pt-44">
        <Image
          src="/images/events/anacortes-arts-festival-2026/festival-booth-front.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="pointer-events-none -z-20 object-cover object-center opacity-50"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,4,3,0.98)_0%,rgba(5,4,3,0.82)_46%,rgba(5,4,3,0.7)_100%),linear-gradient(180deg,rgba(5,4,3,0.48)_0%,#050403_100%)]"
          aria-hidden="true"
        />

        <motion.div
          className="mx-auto grid max-w-[112rem] gap-12"
          variants={stagger}
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
        >
          <motion.div className="max-w-[64rem]" variants={fadeUp}>
            <SectionEyebrow Icon={Sparkles}>Events</SectionEyebrow>
            <h1 className="font-display mt-7 text-[2.85rem] font-semibold leading-[1.15] tracking-[0] text-[#f8f2e9] min-[380px]:text-6xl sm:text-7xl lg:text-8xl">
              <span className="block sm:inline">Upgrade</span>{" "}
              <span className="block sm:inline">Aprons</span>
              <span className="block text-[#e7ad61]">
                in the <span className="block min-[380px]:inline">Market.</span>
              </span>
            </h1>
            <div className="my-8 h-[3px] w-16 bg-[#d6a25f]" />
            <p className="max-w-[42rem] text-lg leading-8 text-[#d8cabc] sm:text-xl">
              Festival days and customer conversations are where Upgrade Aprons
              gets seen, worn, adjusted, and talked through in person.
            </p>
          </motion.div>

          <motion.div
            className="mx-auto grid w-full max-w-[112rem] gap-6"
            variants={stagger}
          >
            {craftEvents.map((event) => (
              <EventCard
                event={event}
                isExpanded={expandedEventId === event.id}
                key={event.id}
                onToggle={(anchor) => toggleEvent(event.id, anchor)}
                reduceMotion={reduceMotion}
              />
            ))}
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}

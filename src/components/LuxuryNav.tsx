"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Scissors, X } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";

const navItems = [
  { label: "About", href: "/about" },
  { label: "Aprons", href: "/products" },
  { label: "Events", href: "/events" },
  { label: "Contact", href: "/contact" },
  { label: "Custom Orders", href: "/custom", isCta: true },
];

const navStagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const navItem: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

export function LuxuryNav() {
  const reduceMotion = useReducedMotion();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  const isActiveLink = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <motion.header
      data-site-scope="site-header"
      className="absolute inset-x-0 top-0 z-30 border-b border-[#d6a25f]/12 bg-[#050403]"
      initial={reduceMotion ? false : { opacity: 0, y: -16 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto flex h-[96px] w-full max-w-[118rem] items-center gap-2 px-4 min-[360px]:px-6 sm:gap-6 sm:px-10 lg:px-12">
        <motion.div
          className="flex flex-none"
          whileHover={reduceMotion ? undefined : { opacity: 0.82 }}
        >
          <Link
            href="/"
            className={`relative flex items-center whitespace-nowrap pb-2 text-white transition-colors duration-300 after:absolute after:bottom-0 after:left-0 after:h-px after:bg-[#d6a25f] after:transition-all after:duration-300 hover:text-[#e7ad61] ${
              isHomePage ? "after:w-full" : "after:w-0"
            }`}
            aria-label="Upgrade Aprons home"
          >
            <span className="font-display text-[1.25rem] font-medium uppercase leading-none tracking-[0.22em] sm:text-[1.75rem] sm:tracking-[0.25em]">
              Upgrade Aprons
            </span>
          </Link>
        </motion.div>

        <motion.nav
          className="ml-auto hidden items-center justify-end gap-8 text-[0.78rem] font-medium uppercase tracking-[0.23em] text-white/86 xl:flex"
          variants={navStagger}
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
          aria-label="Primary navigation"
        >
          {navItems.map((item) => (
            <motion.div
              key={item.label}
              variants={navItem}
              whileHover={reduceMotion ? undefined : { y: -2 }}
            >
              {item.isCta ? (
                <Link
                  href={item.href}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[linear-gradient(135deg,#efbd75,#c7802e)] px-5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] !text-[#050403] shadow-[0_0_24px_rgba(214,162,95,0.24)] transition duration-200 hover:-translate-y-0.5 ${
                    isActiveLink(item.href) ? "ring-1 ring-[#f7d49b]/70" : ""
                  }`}
                >
                  <Scissors size={15} aria-hidden="true" />
                  {item.label}
                </Link>
              ) : (
                <Link
                  href={item.href}
                  className={`relative whitespace-nowrap py-3 transition-colors duration-300 after:absolute after:bottom-0 after:left-1/2 after:h-px after:-translate-x-1/2 after:bg-[#d6a25f] after:transition-all after:duration-300 hover:text-[#e7ad61] ${
                    isActiveLink(item.href)
                      ? "text-[#e7ad61] after:w-14"
                      : "after:w-0 hover:after:w-14"
                  }`}
                >
                  {item.label}
                </Link>
              )}
            </motion.div>
          ))}
        </motion.nav>

        <div className="ml-auto flex items-center gap-4 xl:hidden">
          <motion.button
            type="button"
            className="inline-flex size-12 items-center justify-center rounded-md text-[#e7ad61] transition-colors duration-300 hover:bg-[#d6a25f] hover:text-[#150d06]"
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((current) => !current)}
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="absolute right-6 top-[76px] w-[min(calc(100vw-3rem),24rem)] rounded-lg border border-[#d6a25f]/45 bg-[#060403] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.62)] sm:right-10 lg:right-12 xl:hidden"
            initial={reduceMotion ? false : { opacity: 0, y: -10, scale: 0.98 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <nav
              className="grid gap-1 text-[0.82rem] font-medium uppercase tracking-[0.24em] text-white/88"
              aria-label="Mobile navigation"
            >
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={
                    item.isCta
                      ? "mt-3 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[linear-gradient(135deg,#efbd75,#c7802e)] px-4 !text-[#050403] shadow-[0_0_24px_rgba(214,162,95,0.24)] transition duration-200 hover:-translate-y-0.5"
                      : `border-b border-white/10 px-4 py-4 transition-colors duration-300 hover:text-[#e7ad61] ${
                          isActiveLink(item.href) ? "text-[#e7ad61]" : ""
                        }`
                  }
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.isCta ? <Scissors size={15} aria-hidden="true" /> : null}
                  {item.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

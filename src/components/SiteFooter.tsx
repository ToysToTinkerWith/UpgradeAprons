"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, Phone, Sparkles } from "lucide-react";
import { DiscoverMenu } from "@/components/DiscoverMenu";

const exploreLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/products", label: "Aprons" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <footer
      className="relative overflow-hidden border-t border-[#d6a25f]/30 bg-[#050403] px-6 py-16 text-[#f7f1e8] sm:px-10 lg:px-12 lg:py-20"
      data-site-scope="site-footer"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_64%_12%,rgba(214,162,95,0.15),transparent_42%),radial-gradient(ellipse_at_18%_88%,rgba(43,140,134,0.1),transparent_36%),radial-gradient(ellipse_at_92%_74%,rgba(185,84,56,0.09),transparent_38%),linear-gradient(180deg,#050403_0%,#090604_48%,#050403_100%)]"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto grid max-w-[112rem] gap-12 lg:grid-cols-[1fr_0.65fr_1.2fr] lg:items-start">
        <section aria-label="Upgrade Aprons">
          <Link
            href="/"
            className={`font-display relative inline-flex pb-2 text-3xl font-medium uppercase tracking-[0.22em] text-white transition-colors duration-300 after:absolute after:bottom-0 after:left-0 after:h-px after:bg-[#d6a25f] after:transition-all after:duration-300 hover:text-[#e7ad61] ${
              isHomePage ? "after:w-full" : "after:w-0"
            }`}
          >
            Upgrade Aprons
          </Link>
          <p className="mt-6 max-w-md text-base leading-7 text-[#d8cabc]">
            Handmade from repurposed genuine top-grain leather on Whidbey
            Island for kitchens, studios, gardens, shops, and custom work.
          </p>
          <Link
            href="/custom"
            className="mt-8 inline-flex min-h-14 items-center justify-center rounded-md bg-[linear-gradient(135deg,#efbd75,#c7802e)] px-7 text-sm font-semibold uppercase tracking-[0.18em] !text-[#050403] shadow-[0_0_28px_rgba(214,162,95,0.22)] transition duration-200 hover:-translate-y-0.5"
          >
            Custom Orders
          </Link>
        </section>

        <nav aria-label="Explore" className="grid content-start gap-4">
          <h2 className="font-display text-3xl font-semibold leading-none text-white">
            Explore
          </h2>
          <div className="mb-2 h-px w-14 bg-[#d6a25f]" />
          {exploreLinks.map((link) => (
            <div key={link.href} className="border-b border-white/10 pb-4">
              <Link
                href={link.href}
                className="inline-block text-sm font-semibold uppercase tracking-[0.18em] text-white/72 transition duration-200 hover:translate-x-1 hover:text-[#e7ad61]"
              >
                {link.label}
              </Link>
            </div>
          ))}
          <DiscoverMenu key={pathname} footer />
          <Link href="/contact" data-site-scope="footer-contact" className="border-b border-white/10 pb-4 text-sm font-semibold uppercase tracking-[0.18em] text-white/72 transition duration-200 hover:translate-x-1 hover:text-[#e7ad61]">
            Contact
          </Link>
        </nav>

        <section
          aria-label="Contact"
          className="rounded-lg border border-white/16 bg-[#0e0906]/70 p-7 shadow-[0_24px_62px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-9"
        >
          <div className="flex items-start gap-5">
            <span className="inline-flex size-14 flex-none items-center justify-center rounded-full border border-[#d6a25f]/70 text-[#e7ad61]">
              <Sparkles size={26} strokeWidth={1.35} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-4xl font-semibold leading-none text-white">
                Contact Upgrade Aprons.
              </h2>
              <p className="mt-5 text-base leading-7 text-[#d8cabc]">
                Reach out with custom apron questions, order details, or event
                inquiries.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4">
            <a
              className="flex min-w-0 items-center gap-4 rounded-md border border-white/12 bg-black/20 p-4 text-[#d8cabc] transition duration-200 hover:border-[#d6a25f]/60 hover:bg-[#d6a25f]/10 hover:text-white"
              href="mailto:upgrade@whidbey.com"
            >
              <Mail
                className="flex-none text-[#e7ad61]"
                size={21}
                strokeWidth={1.55}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#e7ad61]">
                  Email
                </span>
                <span className="mt-1 block break-words text-base">
                  upgrade@whidbey.com
                </span>
              </span>
            </a>
            <a
              className="flex min-w-0 items-start gap-4 rounded-md border border-white/12 bg-black/20 p-4 text-[#d8cabc] transition duration-200 hover:border-[#d6a25f]/60 hover:bg-[#d6a25f]/10 hover:text-white"
              href="tel:+13602214404"
            >
              <Phone
                className="mt-0.5 flex-none text-[#e7ad61]"
                size={21}
                strokeWidth={1.55}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#e7ad61]">
                  Landline Phone
                </span>
                <span className="mt-1 block text-base">360-221-4404</span>
                <span className="mt-1 block text-sm leading-6 text-[#cdbdaa]">
                  Voice calls only. This number cannot receive texts.
                </span>
              </span>
            </a>
          </div>
        </section>
      </div>

      <div className="relative z-10 mx-auto mt-12 flex max-w-[112rem] flex-col gap-4 border-t border-[#d6a25f]/26 pt-8 text-sm text-[#c7b7a2] sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {year} Upgrade Aprons. All rights reserved.</p>
        <div className="flex flex-wrap gap-4 sm:justify-end">
          <p>Handmade with genuine top-grain leather on Whidbey Island.</p>
          <Link
            className="text-[#c7b7a2]/70 underline decoration-[#d6a25f]/30 underline-offset-4 transition hover:text-[#e7ad61]"
            href="/login"
          >
            Owner Login
          </Link>
        </div>
      </div>
      <p className="relative z-10 mx-auto mt-6 max-w-[112rem] text-sm leading-6 text-[#c7b7a2]">
        Website made by{" "}
        <a
          href="https://bergquistapplications.com/"
          className="text-[#e7ad61] underline decoration-[#d6a25f]/50 underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6a25f]"
        >
          Bergquist Applications
        </a>
      </p>
    </footer>
  );
}

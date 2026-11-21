"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { discoverLinks } from "@/lib/discover";

export function DiscoverMenu({ mobile = false, footer = false, onNavigate }: {
  mobile?: boolean;
  footer?: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const pathname = usePathname();
  const active = discoverLinks.some(({ href }) => pathname === href);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  return (
    <div
      ref={root}
      data-site-scope={footer ? "discover-footer" : mobile ? "discover-nav-mobile" : "discover-nav-desktop"}
      className={mobile || footer ? "border-b border-white/10" : "relative"}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className={`flex min-h-12 items-center gap-2 uppercase transition-colors hover:text-[#e7ad61] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6a25f] ${footer ? "w-full justify-between pb-4 text-sm font-semibold tracking-[0.18em] text-white/72" : mobile ? "w-full justify-between px-4 py-4" : "py-3"} ${active || open ? "!text-[#e7ad61]" : ""}`}
      >
        <span>Discover</span>
        <ChevronDown size={15} aria-hidden="true" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        id={id}
        hidden={!open}
        className={mobile || footer ? "pb-3 pl-4" : "absolute right-0 top-full w-64 rounded-md border border-[#d6a25f]/35 bg-[#0c0907] p-2 shadow-xl"}
      >
        {discoverLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={`block rounded-sm px-4 py-3 text-sm leading-6 normal-case tracking-normal transition-colors hover:bg-white/5 hover:text-[#e7ad61] focus-visible:outline-2 focus-visible:outline-[#d6a25f] ${pathname === href ? "text-[#e7ad61]" : "text-[#e7ded3]"}`}
            onClick={() => { setOpen(false); onNavigate?.(); }}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

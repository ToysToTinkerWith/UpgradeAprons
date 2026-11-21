"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "lucide-react";
import { SoldBadge } from "@/components/SoldBadge";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type ProductImageViewerProps = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  sold?: boolean;
  frameClassName?: string;
  imageClassName?: string;
};

const easeOut = [0.22, 1, 0.36, 1] as const;

export function ProductImageViewer({
  src,
  alt,
  sizes,
  priority = false,
  sold = false,
  frameClassName = "",
  imageClassName = "",
}: ProductImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const openViewer = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeViewer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const modal = (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Full screen view of ${alt}`}
          tabIndex={-1}
          className="fixed inset-0 z-[100] cursor-zoom-out overflow-hidden bg-[#050403]/96 p-3 text-white outline-none backdrop-blur-sm sm:p-6"
          onClick={closeViewer}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={reduceMotion ? undefined : { opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          {sold ? <SoldBadge /> : null}
          <span className="pointer-events-none absolute right-5 top-5 z-10 inline-flex size-11 items-center justify-center rounded-full border border-[#d6a25f]/60 bg-black/45 text-[#e7ad61] shadow-[0_16px_38px_rgba(0,0,0,0.34)]">
            <X size={24} aria-hidden="true" />
          </span>
          <motion.div
            className="pointer-events-none relative h-full w-full"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 16 }}
            animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.32, ease: easeOut }}
          >
            <Image
              src={src}
              alt={alt}
              fill
              sizes="100vw"
              className="object-contain object-center"
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        aria-label={`View ${alt} full screen${sold ? ", sold" : ""}`}
        className={`relative block w-full cursor-zoom-in ${frameClassName}`}
        onClick={openViewer}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={imageClassName}
        />
        {sold ? <SoldBadge /> : null}
      </button>

      {isOpen ? createPortal(modal, document.body) : null}
    </>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getProductHref, type ApronProduct } from "@/lib/site-data";

export function ProductDetailsLink({ product }: { product: ApronProduct }) {
  return (
    <div className="mt-auto pt-7">
      <Link
        href={getProductHref(product)}
        className="inline-flex min-h-12 max-w-full items-center justify-center gap-3 rounded-md border border-[#efbd75] bg-[#d6a25f] px-5 py-3 font-sans text-sm font-semibold uppercase tracking-normal !text-[#050403] shadow-sm transition hover:bg-[#efbd75] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#efbd75]"
      >
        View Details <ArrowRight className="shrink-0" size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}

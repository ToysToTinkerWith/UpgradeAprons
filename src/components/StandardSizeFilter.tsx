import type { ApronProduct } from "@/lib/site-data";

export type SizeFilter = "all" | "small" | "large";

export function StandardSizeFilter({ products, value, onChange }: {
  products: ApronProduct[];
  value: SizeFilter;
  onChange: (value: SizeFilter) => void;
}) {
  const pending = products.filter(product => !product.standardSize).length;
  const estimated = products.some(product => product.standardSizeEstimated);
  return (
    <div className="mt-8" data-site-static>
      <div role="group" aria-label="Standard apron size" className="flex flex-wrap gap-2">
        {(["all", "small", "large"] as const).map(size => <button type="button" key={size} aria-pressed={value === size} onClick={() => onChange(size)} className={`inline-flex min-h-12 items-center gap-2 rounded border px-5 text-sm font-semibold ${value === size ? "border-[#d6a25f] bg-[#d6a25f] text-[#050403]" : "border-white/25 text-white hover:border-[#d6a25f]"}`}>
          {size === "all" ? "All sizes" : size === "small" ? "Small" : "Large"}<span className="text-xs">({size === "all" ? products.length : products.filter(product => product.standardSize === size).length})</span>
        </button>)}
      </div>
      <p className="mt-3 text-sm leading-6 text-[#d8cabc]">Same price for Small and Large. {pending > 0 ? "Aprons awaiting size confirmation appear in All sizes." : "Check each apron's body measurements for your preferred coverage."}</p>
      {estimated && <p className="mt-2 text-sm leading-6 text-[#d8cabc]">Estimated sizes are based on photos. Confirm the fit before ordering.</p>}
    </div>
  );
}

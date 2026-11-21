export function SoldBadge({ className = "" }: { className?: string }) {
  return (
    <span data-site-static data-sold-badge className={`pointer-events-none absolute left-3 top-3 z-10 rounded-sm border border-[#f4d1ba]/70 bg-[#843c2e] px-3 py-1.5 font-sans text-sm font-bold leading-5 tracking-normal text-white shadow-md ${className}`}>
      SOLD
    </span>
  );
}

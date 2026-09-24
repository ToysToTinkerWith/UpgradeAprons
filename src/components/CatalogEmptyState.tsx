import Link from "next/link";

export function CatalogEmptyState() {
  return (
    <div className="col-span-full py-12 text-center" data-site-static>
      <h2 className="font-display text-3xl font-semibold text-white">
        New aprons coming soon.
      </h2>
      <p className="mt-4 text-base text-[#d8cabc]">
        Ask about a custom apron while the collection is being updated.
      </p>
      <Link className="mt-6 inline-block text-sm font-semibold text-[#e7ad61] underline underline-offset-4" href="/custom">
        Custom Orders
      </Link>
    </div>
  );
}

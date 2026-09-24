import { getProductPriceLabel } from "@/lib/product-pricing";
import type { ApronProduct } from "@/lib/site-data";

export function ProductPrice({
  product,
  className = "",
}: {
  product: ApronProduct;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <strong data-site-static className="font-display text-2xl font-semibold leading-none text-white">
        {getProductPriceLabel(product)}
      </strong>
      {product.limitedEdition ? (
        <span className="rounded-full border border-[#d6a25f]/60 bg-[#d6a25f]/12 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#e7ad61]">
          Limited Edition
        </span>
      ) : null}
    </div>
  );
}

import type { Metadata } from "next";
import { ProductsPage } from "@/components/pages/ProductsPage";

export const metadata: Metadata = {
  title: "Aprons | Upgrade Aprons",
  description:
    "Explore handmade genuine top-grain leather aprons for studios, kitchens, gardens, markets, and custom work.",
};

export default function Products() {
  return <ProductsPage />;
}

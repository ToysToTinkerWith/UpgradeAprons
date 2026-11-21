import { breadcrumbData, pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { ProductsPage } from "@/components/pages/ProductsPage";

export const metadata = pageMetadata({
  path: "/products",
  title: "Handcrafted Leather Apron Collection",
  brandFirst: true,
  description:
    "Explore Upgrade Aprons' handcrafted leather apron collection, made by Crispin on Whidbey Island. Browse standard, crossback and half aprons, with photos and prices.",
});

export default function Products() {
  return (
    <>
      <JsonLd data={breadcrumbData([
        { name: "Home", path: "/" },
        { name: "Handcrafted Leather Aprons", path: "/products" },
      ])} />
      <ProductsPage />
    </>
  );
}

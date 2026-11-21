import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPage } from "@/components/pages/CategoryPage";
import { ProductDetailPage } from "@/components/pages/ProductDetailPage";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbData, categorySeoTitle, pageMetadata } from "@/lib/seo";
import {
  apronCategories,
  apronProducts,
  getCategoryBySlug,
  getProductsByCategorySlug,
  findProductBySegments,
  getProductHref,
  getCategoryHref,
} from "@/lib/site-data";

type ProductPageProps = {
  params: Promise<{ id: string[] }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    ...apronCategories.map((category) => ({
      id: [category.slug],
    })),
    ...apronProducts.map((product) => ({
      id: [product.categorySlug, product.slug],
    })),
  ];
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const category = id.length === 1 ? getCategoryBySlug(id[0]) : undefined;
  const product = id.length > 1 ? findProductBySegments(id) : undefined;

  if (category) {
    return pageMetadata({
      title: categorySeoTitle(category.slug),
      description: category.description,
      path: getCategoryHref(category),
      image: category.image,
    });
  }

  if (!product) {
    return {
      title: "Apron Not Found | Upgrade Aprons",
      robots: { index: false, follow: false },
    };
  }

  return pageMetadata({
    title: product.title.replace(/Apron$/, "Leather Apron"),
    description: `Handcrafted leather apron. ${product.intro}`,
    path: getProductHref(product),
    image: product.imageUrl || product.image,
  });
}

export default async function ProductDetail({ params }: ProductPageProps) {
  const { id } = await params;

  if (id.length === 1) {
    const category = getCategoryBySlug(id[0]);

    if (!category) {
      notFound();
    }

    return (
      <>
        <JsonLd data={breadcrumbData([
          { name: "Home", path: "/" },
          { name: "Handcrafted Leather Aprons", path: "/products" },
          { name: categorySeoTitle(category.slug), path: getCategoryHref(category) },
        ])} />
        <CategoryPage
          category={category}
          products={getProductsByCategorySlug(category.slug)}
        />
      </>
    );
  }

  const product = findProductBySegments(id);

  if (!product) {
    notFound();
  }

  return (
    <>
      <JsonLd data={breadcrumbData([
        { name: "Home", path: "/" },
        { name: "Handcrafted Leather Aprons", path: "/products" },
        { name: categorySeoTitle(product.categorySlug), path: `/products/${product.categorySlug}` },
        { name: product.title, path: getProductHref(product) },
      ])} />
      <ProductDetailPage product={product} />
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPage } from "@/components/pages/CategoryPage";
import { ProductDetailPage } from "@/components/pages/ProductDetailPage";
import {
  apronCategories,
  apronProducts,
  getCategoryBySlug,
  getProductsByCategorySlug,
  findProductBySegments,
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
    const categoryTitle = category.title.endsWith("Apron")
      ? category.title
      : `${category.title} Aprons`;

    return {
      title: `${categoryTitle} | Upgrade Aprons`,
      description: category.description,
      openGraph: {
        title: `${categoryTitle} | Upgrade Aprons`,
        description: category.description,
        images: [category.image],
      },
      twitter: {
        card: "summary_large_image",
        title: `${categoryTitle} | Upgrade Aprons`,
        description: category.description,
        images: [category.image],
      },
    };
  }

  if (!product) {
    return {
      title: "Apron Not Found | Upgrade Aprons",
    };
  }

  return {
    title: `${product.title} | Upgrade Aprons`,
    description: product.intro,
    openGraph: {
      title: `${product.title} | Upgrade Aprons`,
      description: product.intro,
      images: [product.image],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.title} | Upgrade Aprons`,
      description: product.intro,
      images: [product.image],
    },
  };
}

export default async function ProductDetail({ params }: ProductPageProps) {
  const { id } = await params;

  if (id.length === 1) {
    const category = getCategoryBySlug(id[0]);

    if (!category) {
      notFound();
    }

    return (
      <CategoryPage
        category={category}
        products={getProductsByCategorySlug(category.slug)}
      />
    );
  }

  const product = findProductBySegments(id);

  if (!product) {
    notFound();
  }

  return <ProductDetailPage product={product} />;
}

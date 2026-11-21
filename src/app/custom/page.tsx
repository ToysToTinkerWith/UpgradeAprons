import { pageMetadata } from "@/lib/seo";
import { CustomOrdersPage } from "@/components/pages/CustomOrdersPage";

export const metadata = pageMetadata({
  path: "/custom",
  title: "Design Your Custom Leather Apron",
  description:
    "Design a custom handmade leather apron with your choice of colors and pocket layout. Upload an inspiration image and send your design to Crispin for a quote.",
});

export default function CustomOrders() {
  return <CustomOrdersPage />;
}

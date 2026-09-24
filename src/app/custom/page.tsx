import type { Metadata } from "next";
import { CustomOrdersPage } from "@/components/pages/CustomOrdersPage";

export const metadata: Metadata = {
  title: "Custom Orders | Upgrade Aprons",
  description:
    "Start a custom handmade leather apron request with Upgrade Aprons.",
};

export default function CustomOrders() {
  return <CustomOrdersPage />;
}

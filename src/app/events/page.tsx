import type { Metadata } from "next";
import { PressPage } from "@/components/pages/PressPage";

export const metadata: Metadata = {
  title: "Events | Upgrade Aprons",
  description:
    "Festival notes, market photos, and event stories from Upgrade Aprons.",
};

export default function Events() {
  return <PressPage />;
}

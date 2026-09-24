import type { Metadata } from "next";
import { AboutPage } from "@/components/pages/AboutPage";

export const metadata: Metadata = {
  title: "About | Upgrade Aprons",
  description:
    "Learn about Upgrade Aprons, handmade genuine leather aprons shaped by decades of upholstery craft.",
};

export default function About() {
  return <AboutPage />;
}

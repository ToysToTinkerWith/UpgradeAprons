import { pageMetadata } from "@/lib/seo";
import { AboutPage } from "@/components/pages/AboutPage";

export const metadata = pageMetadata({
  path: "/about",
  title: "Handmade on Whidbey Island | Our Story",
  description:
    "Meet Crispin T. Roberts, the maker behind Upgrade Aprons. More than 40 years of upholstery craft shapes each handmade leather apron on Whidbey Island.",
});

export default function About() {
  return <AboutPage />;
}

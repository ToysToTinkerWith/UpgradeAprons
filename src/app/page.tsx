import { HomePage } from "@/components/pages/HomePage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Handcrafted Leather Aprons & Custom Designs",
  brandFirst: true,
  description: "Discover handcrafted leather aprons made on Whidbey Island. Explore standard, crossback and half aprons, or design a custom apron with colors and pockets for your work.",
  path: "/",
});

export default function Home() {
  return <HomePage />;
}

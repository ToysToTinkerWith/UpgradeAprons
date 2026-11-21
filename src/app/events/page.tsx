import { pageMetadata } from "@/lib/seo";
import { PressPage } from "@/components/pages/PressPage";

export const metadata = pageMetadata({
  path: "/events",
  title: "Handcrafted Aprons at Markets & Events",
  description:
    "Upcoming markets, holiday shows, festival photos, and event stories from Upgrade Aprons.",
});

export default function Events() {
  return <PressPage />;
}

import type { Metadata } from "next";
import { OwnerSiteRedirect } from "@/components/OwnerSiteRedirect";

export const metadata: Metadata = {
  title: "Owner Dashboard | Upgrade Aprons",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Dashboard() {
  return <OwnerSiteRedirect />;
}

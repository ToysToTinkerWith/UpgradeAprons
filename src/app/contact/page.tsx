import type { Metadata } from "next";
import { ContactPage } from "@/components/pages/ContactPage";

export const metadata: Metadata = {
  title: "Contact | Upgrade Aprons",
  description: "Send a direct custom apron message to Upgrade Aprons.",
};

export default function Contact() {
  return <ContactPage />;
}

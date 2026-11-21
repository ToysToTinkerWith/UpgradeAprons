import { pageMetadata } from "@/lib/seo";
import { ContactPage } from "@/components/pages/ContactPage";

export const metadata = pageMetadata({
  path: "/contact",
  title: "Contact the Maker | Leather Apron Inquiries",
  description: "Talk with Crispin about a handcrafted leather apron, available colors, pocket layouts or a custom order. Contact Upgrade Aprons on Whidbey Island.",
});

export default function Contact() {
  return <ContactPage />;
}

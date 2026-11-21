import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import { FirebaseAnalytics } from "@/components/FirebaseAnalytics";
import { LuxuryNav } from "@/components/LuxuryNav";
import { SiteEditor } from "@/components/SiteEditor";
import { SiteFooter } from "@/components/SiteFooter";
import { apronProducts } from "@/lib/site-data";
import { createWorkshopPreloadScript } from "@/lib/workshop-preload";
import { JsonLd } from "@/components/JsonLd";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  robots: { index: true, follow: true, googleBot: { "max-image-preview": "large" } },
  title: "Upgrade Aprons",
  description:
    "Handmade, repurposed genuine top-grain leather aprons crafted with character and built to last.",
  openGraph: {
    title: "Upgrade Aprons",
    description:
      "Handmade, repurposed genuine top-grain leather aprons crafted with character and built to last.",
    images: [
      {
        url: "/og-craft-character-20261004.png",
        width: 1200,
        height: 630,
        alt: "Where Craft Meets Character — three handmade leather aprons on a warm leather background.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Upgrade Aprons",
    description:
      "Handmade, repurposed genuine top-grain leather aprons crafted with character and built to last.",
    images: [
      {
        url: "/og-craft-character-20261004.png",
        width: 1200,
        height: 630,
        alt: "Where Craft Meets Character — three handmade leather aprons on a warm leather background.",
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} h-full antialiased`}
    >
      <head>
        <script id="workshop-preload" dangerouslySetInnerHTML={{ __html: createWorkshopPreloadScript(apronProducts) }} />
      </head>
      <body className="min-h-full flex flex-col">
        <JsonLd data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": absoluteUrl("/#organization"),
              name: SITE_NAME,
              url: SITE_URL,
              description: "Handcrafted leather aprons made from repurposed genuine top-grain leather on Whidbey Island, Washington.",
              email: "upgrade@whidbey.com",
              telephone: "+1-360-221-4404",
              founder: { "@type": "Person", name: "Crispin T. Roberts" },
            },
            {
              "@type": "WebSite",
              "@id": absoluteUrl("/#website"),
              url: SITE_URL,
              name: SITE_NAME,
              inLanguage: "en-US",
              publisher: { "@id": absoluteUrl("/#organization") },
            },
          ],
        }} />
        <FirebaseAnalytics />
        <LuxuryNav />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <SiteEditor />
      </body>
    </html>
  );
}

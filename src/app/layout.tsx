import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import { FirebaseAnalytics } from "@/components/FirebaseAnalytics";
import { LuxuryNav } from "@/components/LuxuryNav";
import { SiteEditor } from "@/components/SiteEditor";
import { SiteFooter } from "@/components/SiteFooter";
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
  metadataBase: new URL("https://upgradeaprons.web.app"),
  title: "Upgrade Aprons",
  description:
    "Handmade, repurposed genuine top-grain leather aprons crafted with character and built to last.",
  openGraph: {
    title: "Upgrade Aprons",
    description:
      "Handmade, repurposed genuine top-grain leather aprons crafted with character and built to last.",
    images: [
      {
        url: "/og.png?v=20260905",
        width: 1200,
        height: 630,
        alt: "Upgrade Aprons - Where craft meets character.",
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
        url: "/og.png?v=20260905",
        width: 1200,
        height: 630,
        alt: "Upgrade Aprons - Where craft meets character.",
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
      <body className="min-h-full flex flex-col">
        <FirebaseAnalytics />
        <LuxuryNav />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <SiteEditor />
      </body>
    </html>
  );
}

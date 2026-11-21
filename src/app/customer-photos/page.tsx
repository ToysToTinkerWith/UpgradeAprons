import { pageMetadata } from "@/lib/seo";
import Image from "next/image";

export const metadata = pageMetadata({
  path: "/customer-photos",
  title: "Leather Aprons at Work | Customer Photos",
  description: "Upgrade Aprons out in the world: customer photos from workshops, kitchens, gardens, and everyday life.",
});

const photos = [
  { file: "workshop", alt: "Customer wearing a colorful leather half apron over overalls in a workshop" },
  { file: "kitchen", alt: "Customer wearing a blue leather apron with contrasting pockets in a kitchen" },
  { file: "outdoors", alt: "Customer wearing a gray leather apron beside a car outdoors" },
  { file: "garden", alt: "Customer wearing a lavender half apron beside flowering planters in a garden" },
  { file: "mirror-selfie", alt: "Customer taking a mirror selfie in a dark leather apron with red and light gray pockets" },
  { file: "coffee-team", alt: "Four customers wearing leather aprons with contrasting pockets and coffee company patches", width: 1200, height: 900 },
  { file: "outdoor-market", alt: "Two people wearing a dark full-length leather apron and a light half apron at an outdoor market", width: 960, height: 1280 },
];

export default function CustomerPhotosPage() {
  return (
    <main className="bg-[#080706] px-6 pb-16 pt-36 sm:px-10 sm:pb-24 sm:pt-40 lg:px-12" data-site-scope="customer-photos">
      <div className="mx-auto max-w-[72rem]">
        <header className="mb-9 max-w-2xl sm:mb-12">
          <p className="text-sm font-semibold text-[#e7ad61]">Discover</p>
          <h1 className="font-display mt-4 text-5xl font-semibold leading-[1.1] text-white sm:text-7xl">Customer Photos</h1>
          <p className="mt-5 text-lg leading-8 text-[#d8cabc]">
            From workshops and kitchens to time in the garden, our aprons become
            part of everyday life. Here are a few of our customers making them their own.
          </p>
        </header>
        <section aria-label="Customer photo gallery" className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2 sm:gap-8">
          {photos.map((photo, index) => (
            <Image
              key={photo.file}
              src={`/images/customer-photos/${photo.file}.webp`}
              alt={photo.alt}
              width={photo.width ?? 1200}
              height={photo.height ?? 1600}
              sizes="(min-width: 1232px) 560px, (min-width: 640px) calc((100vw - 112px) / 2), calc(100vw - 48px)"
              priority={index === 0}
              className="h-auto w-full rounded-sm border border-[#d6a25f]/20"
            />
          ))}
        </section>
      </div>
    </main>
  );
}

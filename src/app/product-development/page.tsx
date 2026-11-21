import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Layers, Scissors, Wrench } from "lucide-react";
import { pageMetadata, breadcrumbData } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";

export const metadata = pageMetadata({
  path: "/product-development",
  title: "Product Development | Garden Tool Holster Prototype",
  description: "A look at the garden tool holster prototype from Upgrade Aprons: layered leather pockets, a tool loop, and an adjustable waist belt. In development, not yet for sale.",
  image: "/images/product-development/garden-holster-loaded.webp",
});

const details = [
  { Icon: Layers, title: "Layered storage", copy: "A deep main pocket and stacked front pockets bring different tool shapes into one compact layout." },
  { Icon: Scissors, title: "A place for the small tools", copy: "The prototype is pictured with pruning shears, a trowel, a cultivator, and a narrow hand tool. A side loop adds another holding point." },
  { Icon: Wrench, title: "Waist-worn design", copy: "An adjustable webbing belt and side-release buckle hold the leather holster at the waist, without a full apron body." },
];

export default function ProductDevelopmentPage() {
  return (
    <main className="bg-[#080706] px-6 pb-20 pt-36 text-[#f7f1e8] sm:px-10 sm:pt-40 lg:px-12" data-site-scope="product-development">
      <JsonLd data={breadcrumbData([{ name: "Home", path: "/" }, { name: "Product Development", path: "/product-development" }])} />
      <div className="mx-auto max-w-[76rem]">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold text-[#e7ad61]">Discover / From the workbench</p>
          <h1 className="font-display mt-5 text-5xl font-semibold leading-tight text-white sm:text-7xl">Product Development</h1>
          <p className="mt-5 text-lg leading-8 text-[#d8cabc]">New ideas, still taking shape. A closer look at the pieces being developed beyond the apron collection.</p>
        </header>

        <section aria-labelledby="holster-title" className="mt-12 border-t border-white/20 pt-8 sm:mt-16">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div><p className="text-sm font-semibold text-[#8ca9b9]">Prototype No. 01</p><h2 id="holster-title" className="font-display mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">Garden Tool Holster</h2></div>
            <p className="border-l-2 border-[#d6a25f] pl-4 text-sm leading-6"><strong className="block text-[#e7ad61]">In development</strong><span className="text-[#d8cabc]">Not yet available for purchase</span></p>
          </div>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#d8cabc]">A waist-worn leather holster for garden essentials. Burgundy and rust-toned panels, dark front pockets, and contrast stitching give this working prototype its character.</p>
          <div className="mt-9 grid items-start gap-7 md:grid-cols-2">
            <figure>
              <Image src="/images/product-development/garden-holster-layout.webp" alt="Garden tool holster prototype laid out beside gloves, a trowel, pruning shears, and a cultivator" width={1440} height={1920} sizes="(min-width: 1280px) 590px, (min-width: 768px) 46vw, 100vw" className="h-auto w-full rounded-sm" />
              <figcaption className="mt-4 flex gap-4 text-sm leading-6 text-[#d8cabc]"><span className="text-[#e7ad61]">01</span><span>The layout, with the tools it is being developed to carry.</span></figcaption>
            </figure>
            <figure>
              <Image src="/images/product-development/garden-holster-loaded.webp" alt="Burgundy leather garden holster prototype with hand tools in its main pocket and pruning shears in the front pockets" width={1440} height={1920} sizes="(min-width: 1280px) 590px, (min-width: 768px) 46vw, 100vw" className="h-auto w-full rounded-sm" />
              <figcaption className="mt-4 flex gap-4 text-sm leading-6 text-[#d8cabc]"><span className="text-[#e7ad61]">02</span><span>The same prototype with its pockets loaded.</span></figcaption>
            </figure>
          </div>
        </section>

        <section aria-label="Prototype details" className="mt-14 grid gap-9 border-y border-white/20 py-10 md:grid-cols-3">
          {details.map(({ Icon, title, copy }) => <div key={title}><Icon className="text-[#e7ad61]" size={27} strokeWidth={1.5} aria-hidden="true" /><h3 className="font-display mt-5 text-3xl font-semibold text-white">{title}</h3><p className="mt-3 text-base leading-7 text-[#d8cabc]">{copy}</p></div>)}
        </section>

        <section className="mt-12 grid gap-8 md:grid-cols-2 md:items-start">
          <div><p className="text-sm font-semibold text-[#8ca9b9]">Still on the workbench</p><h2 className="font-display mt-4 text-4xl font-semibold text-white">A prototype, not a finished range.</h2><p className="mt-4 text-base leading-7 text-[#d8cabc]">The pocket layout, fit, and final details may change as development continues. There is no confirmed release date or price yet.</p></div>
          <div><h2 className="font-display text-3xl font-semibold text-white">What do you carry?</h2><p className="mt-4 text-base leading-7 text-[#d8cabc]">Share the tools you reach for and what you would want from a garden holster. Your notes can help inform the next version.</p><Link href="/contact" className="mt-6 inline-flex min-h-12 items-center gap-3 rounded-md bg-[#d6a25f] px-5 py-3 text-sm font-semibold !text-[#050403] hover:bg-[#efbd75]">Share your thoughts <ArrowRight size={18} aria-hidden="true" /></Link></div>
        </section>
      </div>
    </main>
  );
}

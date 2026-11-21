import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ArrowRight, Scissors } from "lucide-react";
import { ProductImageViewer } from "@/components/ProductImageViewer";

export const metadata = pageMetadata({
  path: "/leather-hardware",
  title: "Leather, Stitching & Apron Hardware",
  description: "A closer look at Upgrade Aprons: genuine upholstery leather, carefully placed stitching, metal fasteners, woven ties, and the work behind each apron.",
});

const heading = "font-display text-4xl font-semibold leading-[1.12] text-white sm:text-5xl";
const prose = "text-base leading-8 text-[#d8cabc] sm:text-lg";
const label = "text-sm font-semibold text-[#e7ad61]";
const section = "mx-auto max-w-[88rem] px-6 py-14 sm:px-10 sm:py-20 lg:px-12";

function DetailPhoto({ name, alt, caption, landscape = false, priority = false }: {
  name: string;
  alt: string;
  caption: string;
  landscape?: boolean;
  priority?: boolean;
}) {
  return (
    <figure className="min-w-0">
      <ProductImageViewer
        src={`/images/materials/${name}.webp`}
        alt={alt}
        sizes="(min-width: 1440px) 620px, (min-width: 768px) 48vw, 100vw"
        priority={priority}
        frameClassName={`${landscape ? "aspect-[4/3]" : "aspect-[3/4]"} overflow-hidden rounded-sm bg-[#171513] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6a25f]`}
        imageClassName="object-contain"
      />
      <figcaption className="mt-4 border-l border-[#d6a25f]/50 pl-4 text-sm leading-6 text-[#bfb2a4]">
        {caption}
      </figcaption>
    </figure>
  );
}

export default function LeatherHardwarePage() {
  return (
    <main className="bg-[#080706] pt-[97px]" data-site-scope="leather-hardware">
      <header className={`${section} !pb-10 sm:!pb-14`}>
        <p className={label}>Discover / The materials</p>
        <h1 className="font-display mt-5 text-5xl font-semibold leading-[1.08] text-white sm:text-7xl">
          Leather &amp; Hardware
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#d8cabc] sm:text-xl">
          Genuine leather, thoughtful details, and a second life for materials
          worth keeping. A closer look at what goes into an Upgrade Apron.
        </p>
        <Link href="/products" className="mt-6 inline-flex min-h-12 items-center gap-3 text-[#e7ad61] underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6a25f]">
          Browse the Upgrade Aprons collection <ArrowRight className="shrink-0" size={18} aria-hidden="true" />
        </Link>
        <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-x-7 gap-y-3 border-t border-[#d6a25f]/25 pt-5 text-sm text-[#e7ad61]">
          <a className="py-2 underline-offset-4 hover:underline" href="#leather">The leather</a>
          <a className="py-2 underline-offset-4 hover:underline" href="#hardware">The hardware</a>
          <a className="py-2 underline-offset-4 hover:underline" href="#workbench">At the workbench</a>
        </nav>
      </header>

      <section id="leather" className="scroll-mt-8 border-y border-white/10 bg-[#101311]" data-site-scope="materials-leather">
        <div className={`${section} grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16`}>
          <DetailPhoto
            name="eyelet-and-woven-tie"
            alt="Gold-tone eyelet with a black woven tie, red stitching, and a blue pocket on dark leather"
            caption="Texture, color, and construction together: dark leather, a blue pocket, red stitching, and a woven tie threaded through a gold-tone eyelet."
            landscape priority
          />
          <div>
            <p className={label}>01 / The leather</p>
            <h2 className={`${heading} mt-4`}>Good material.<br />Another chapter.</h2>
            <p className={`${prose} mt-6`}>
              Upgrade Aprons uses genuine high-performance upholstery leathers,
              predominantly sourced from European hides. Crispin brings remnants
              and overage from more than 40 years of upholstery work back to the
              cutting table, giving them a new purpose as aprons.
            </p>
            <p className={`${prose} mt-5`}>
              The leather is the starting point for each piece. Its color, grain,
              and the shape of the available remnant help inform the combinations
              of apron body, pockets, and straps. The photographs here show that
              variety up close, from softly textured blue to richly colored burgundy.
            </p>
          </div>
        </div>
      </section>

      <section className={`${section} grid gap-8 border-b border-white/10 md:grid-cols-[0.65fr_1fr] md:gap-16`} aria-labelledby="material-story" data-site-scope="materials-origin">
        <div>
          <p className={label}>Material origins</p>
          <h2 id="material-story" className={`${heading} mt-4`}>Making more of<br />what already exists.</h2>
        </div>
        <div className={prose}>
          <p>
            Leather is the original upcycled material: a
            by-product of the food industry, put to use rather than discarded.
            Tanneries strive to recover energy from waste and reuse water as
            part of their sustainability efforts.
          </p>
          <p className="mt-5">
            Upgrade Aprons adds another chapter by repurposing upholstery
            remnants and overage. Rather than starting with a new supply for
            every apron, Crispin works with leather already on hand, finding a
            place for smaller pieces in pockets, straps, and contrasting details.
          </p>
          <p className="mt-5">
            The result is a collection shaped by the materials available, with
            combinations that do not need to look alike to belong together.
          </p>
        </div>
      </section>

      <section id="hardware" className={`${section} scroll-mt-8`} data-site-scope="materials-hardware">
        <div className="mb-10 max-w-2xl">
          <p className={label}>02 / The hardware</p>
          <h2 className={`${heading} mt-4`}>The details that bring it together.</h2>
          <p className={`${prose} mt-6`}>
            Look beyond the pockets and you will find another layer of choices:
            the attachment of a strap, the finish of an eyelet, and a line of
            stitching that either blends in or stands out. These are details
            from individual aprons; hardware and strap arrangements vary by piece.
          </p>
        </div>
        <div className="grid gap-10 md:grid-cols-2 md:gap-8">
          <div>
            <DetailPhoto
              name="burgundy-strap-fasteners"
              alt="Two silver-tone fasteners on a burgundy leather neck strap beside blue contrast stitching"
              caption="Burgundy leather with two silver-tone strap fasteners. Blue stitching follows the edge and picks up the color of the pocket."
            />
            <h3 className="font-display mt-7 text-3xl font-semibold leading-tight text-white">A little contrast.</h3>
            <p className={`${prose} mt-3`}>
              A matching leather strap keeps the color story simple, while bright
              metal and blue thread add definition. The rounded end of the strap
              sits against the apron body, leaving the attachment visible.
            </p>
          </div>
          <div>
            <DetailPhoto
              name="blue-leather-tonal-stitching"
              alt="Pale blue leather strap with silver-tone fasteners, tonal stitching, and a burgundy pocket"
              caption="A quieter combination: pale blue leather, matching thread, silver-tone fasteners, and a deep burgundy pocket."
            />
            <h3 className="font-display mt-7 text-3xl font-semibold leading-tight text-white">Or a softer line.</h3>
            <p className={`${prose} mt-3`}>
              Here the stitching follows the same color family as the apron,
              allowing the leather texture and contrasting pocket to take the
              lead. Similar construction can have a very different character
              through color alone.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#101311]" data-site-scope="materials-fit">
        <div className={`${section} grid items-center gap-10 md:grid-cols-2 lg:gap-20`}>
          <div>
            <p className={label}>Ties, buckles &amp; the reverse side</p>
            <h2 className={`${heading} mt-4`}>There is more to an apron than its front.</h2>
            <div className="mt-8 divide-y divide-white/10">
              <div className="pb-6">
                <h3 className="font-display text-2xl font-semibold text-white">Woven ties &amp; metal eyelets</h3>
                <p className={`${prose} mt-3`}>The black tie in the first photograph passes through a metal eyelet and is knotted at the apron edge. Its woven texture contrasts with the leather beside it.</p>
              </div>
              <div className="py-6">
                <h3 className="font-display text-2xl font-semibold text-white">An adjustable buckle closure</h3>
                <p className={`${prose} mt-3`}>This apron uses a woven belt with a side-release buckle and strap adjusters. The close-up shows the closure from the back, along with the stitching behind the front pockets.</p>
              </div>
              <div className="pt-6">
                <h3 className="font-display text-2xl font-semibold text-white">The other face of the leather</h3>
                <p className={`${prose} mt-3`}>The soft-looking, fibrous reverse is a different surface from the finished front. Together, the two sides reveal more of the material than a product photograph alone.</p>
              </div>
            </div>
          </div>
          <DetailPhoto
            name="adjustable-buckle-reverse"
            alt="Black side-release buckle and adjustable woven belt across the gray reverse of a leather apron"
            caption="The reverse of an apron: a side-release buckle, two strap adjusters, and the pocket stitching visible against the leather's fibrous surface."
          />
        </div>
      </section>

      <section id="workbench" className={`${section} grid scroll-mt-8 items-center gap-10 md:grid-cols-2 lg:gap-20`} data-site-scope="materials-workbench">
        <DetailPhoto
          name="crispin-workbench"
          alt="Leather pocket pieces, rotary cutter, ruler, mallet, setting tools, and metal hardware on a gridded cutting mat"
          caption="At the workbench: burgundy and mustard leather pieces, a stitched pocket, cutting and setting tools, and loose hardware ready for the next step."
        />
        <div>
          <p className={label}>03 / At the workbench</p>
          <h2 className={`${heading} mt-4`}>From a remnant<br />to a useful detail.</h2>
          <p className={`${prose} mt-6`}>
            The work starts with the pieces themselves. On the cutting mat,
            leather is considered alongside the tools and hardware that will
            turn it into something useful. A stitched pocket rests beside an
            unstitched piece, showing the small decisions that give the finished
            apron its shape.
          </p>
          <p className={`${prose} mt-5`}>
            Rounded corners, a contrasting pocket, or a different thread color
            can change the feel of a piece. That is where Crispin&apos;s upholstery
            background meets the practical needs of the person who will wear it.
          </p>
          <Link href="/about" className="mt-7 inline-flex min-h-12 items-center gap-3 text-[#e7ad61] underline-offset-4 hover:underline">
            Meet Crispin <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="border-t border-[#d6a25f]/25" data-site-scope="materials-next">
        <div className={`${section} flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between`}>
          <div className="max-w-xl">
            <h2 className={heading}>Find your combination.</h2>
            <p className={`${prose} mt-4`}>Explore the current aprons, or talk with Crispin about colors, pockets, and the way you work.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/products" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-md border border-[#d6a25f]/70 px-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#e7ad61] transition-colors hover:bg-[#d6a25f]/10">Explore Aprons <ArrowRight className="shrink-0" size={18} aria-hidden="true" /></Link>
            <Link href="/custom" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-md bg-[#d6a25f] px-6 text-sm font-semibold uppercase tracking-[0.18em] !text-[#050403] transition-colors hover:bg-[#efbd75]"><Scissors className="shrink-0" size={18} aria-hidden="true" /> Custom Orders</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

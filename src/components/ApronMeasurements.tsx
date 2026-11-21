import { useId } from "react";
import Link from "next/link";
import type { ApronProduct } from "@/lib/site-data";
import { formatMeasurement, getStandardSizeLabel } from "@/lib/product-sizing";
import standardTemplates from "@/data/standard-apron-templates.json";

function StandardApronDiagram({ template, id }: {
  template: typeof standardTemplates.small;
  id: string;
}) {
  const { totalWidth: width, totalHeight: height, bibWidth, bodyHeight } = template;
  const left = (width - bibWidth) / 2, right = left + bibWidth;
  const shoulder = height - bodyHeight + .35;
  const scale = 210 / width;
  const bottom = 80 + height * scale;
  const bibLeft = 40 + left * scale, bibRight = 40 + right * scale;
  // Same standard-apron curves and proportions as the custom designer.
  const outline = `M ${left} 0 H ${right} C ${right + .18} ${shoulder * .18}, ${width - 3.65} ${shoulder * .84}, ${width} ${shoulder} V ${height} H 0 V ${shoulder} C 3.65 ${shoulder * .84}, ${left - .18} ${shoulder * .18}, ${left} 0 Z`;
  return (
    <svg viewBox="0 0 320 420" role="img" aria-labelledby={`${id}-title ${id}-desc`} className="mx-auto w-full max-w-[19rem] text-[#d6a25f]" data-standard-size-diagram>
      <title id={`${id}-title`}>Standard apron body measurement guide</title>
      <desc id={`${id}-desc`}>A is body width, B is bib-to-hem body length, and C is bib width. Faint straps are excluded from measurements. Outline follows the design-tool template; pockets are illustrative.</desc>
      <defs><marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
      <g fill="none" stroke="currentColor" opacity=".4">
        <path d={`M ${bibLeft + 5} 96 L ${bibLeft + 17} 27 Q 145 7 ${bibRight - 17} 27 L ${bibRight - 5} 96`} strokeWidth="5" strokeLinejoin="round" />
        <path d={`M43 ${80 + shoulder * scale + 5} Q18 ${100 + shoulder * scale} 23 ${bottom - 10} M247 ${80 + shoulder * scale + 5} Q270 ${100 + shoulder * scale} 263 ${bottom - 10}`} strokeWidth="3" />
      </g>
      <g transform={`translate(40 80) scale(${scale})`} strokeWidth={1.5 / scale}>
        <path d={outline} fill="#8ca9b914" stroke="currentColor" data-apron-outline />
        <g fill="none" stroke="#8ca9b9">
          <rect x={width / 2 - 2.5} y="5" width="5" height="5.5" />
          <path d={`M ${width / 2 - 8} ${height - 10} h16 v8 h-16 Z M ${width / 2} ${height - 10} v8`} />
        </g>
        <g fill="currentColor">
          <circle cx={left + .5} cy=".85" r=".17" /><circle cx={right - .5} cy=".85" r=".17" />
          <circle cx=".55" cy={shoulder + .5} r=".23" /><circle cx={width - .55} cy={shoulder + .5} r=".23" />
        </g>
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d={`M40 ${bottom + 8} V${bottom + 36} M250 ${bottom + 8} V${bottom + 36} M${bibRight + 6} 80 H292 M258 ${bottom} H292 M${bibLeft} 72 V48 M${bibRight} 72 V48`} opacity=".5" />
        <path d={`M44 ${bottom + 24} H246`} markerStart={`url(#${id}-arrow)`} markerEnd={`url(#${id}-arrow)`} />
        <path d={`M284 84 V${bottom - 4}`} markerStart={`url(#${id}-arrow)`} markerEnd={`url(#${id}-arrow)`} />
        <path d={`M${bibLeft + 4} 58 H${bibRight - 4}`} markerStart={`url(#${id}-arrow)`} markerEnd={`url(#${id}-arrow)`} />
      </g>
      <g fill="currentColor" fontSize="18" fontFamily="inherit" textAnchor="middle">
        <text x="145" y={bottom + 49}>A</text><text x="307" y={(80 + bottom) / 2 + 6}>B</text><text x="145" y="49">C</text>
      </g>
    </svg>
  );
}

export function ApronMeasurements({ product }: { product: ApronProduct }) {
  const id = useId();
  const half = product.categorySlug === "half-apron";
  const template = product.categorySlug === "standard" && product.standardSize
    ? standardTemplates[product.standardSize] : null;
  const measurements = product.measurements ?? (template ? {
    bodyWidthInches: template.totalWidth, bodyLengthInches: template.totalHeight,
  } : null);
  const usesTemplate = Boolean(template && !product.measurements);
  const top = half ? 150 : 40;
  return (
    <section aria-label="Apron measurements" className="mt-8 border-t border-white/20 pt-7" data-site-static>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-3xl font-semibold text-white">Size &amp; fit</h2>
        {product.categorySlug === "standard" ? <span className="text-sm text-[#e7ad61]">{getStandardSizeLabel(product)}</span> : null}
      </div>
      <div className="mt-5 grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {template ? <StandardApronDiagram template={template} id={id} /> : <svg viewBox="0 0 320 350" role="img" aria-labelledby={`${id}-title ${id}-desc`} className="mx-auto w-full max-w-[19rem] text-[#d6a25f]">
          <title id={`${id}-title`}>Apron body measurement guide</title>
          <desc id={`${id}-desc`}>A measures the widest part of the apron body. B measures {half ? "waist to hem" : "top of the bib to hem"}. Straps are excluded. Diagram not to scale.</desc>
          <defs><marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
          <path d={half ? "M45 150H235L245 280H35Z" : "M105 40H175Q185 125 220 145L245 280H35L60 145Q95 125 105 40Z"} fill="#8ca9b914" stroke="currentColor" strokeWidth="2" />
          {!half && <path d="M120 102H160V143H120Z" fill="none" stroke="#8ca9b9" strokeWidth="1.5" />}
          <path d="M70 195H210V256H70ZM140 195V256" fill="none" stroke="#8ca9b9" strokeWidth="1.5" />
          <g stroke="currentColor" strokeWidth="1.5" fill="none">
            <path d="M35 292V323M245 292V323" opacity=".5" />
            <path d="M40 309H240" markerStart={`url(#${id}-arrow)`} markerEnd={`url(#${id}-arrow)`} />
            <path d={`M250 ${top}H290M257 280H290`} opacity=".5" />
            <path d={`M278 ${top + 5}V275`} markerStart={`url(#${id}-arrow)`} markerEnd={`url(#${id}-arrow)`} />
          </g>
          <g fill="currentColor" fontSize="18" fontFamily="inherit" textAnchor="middle"><text x="140" y="338">A</text><text x="303" y={(top + 280) / 2 + 6}>B</text></g>
        </svg>}
        <dl className="grid gap-6 text-base">
          <div><dt className="text-[#e7ad61]">A. Body width</dt><dd className="mt-2 font-semibold text-white">{measurements ? formatMeasurement(measurements.bodyWidthInches) : "Not yet measured"}</dd><dd className="mt-1 text-sm text-[#d8cabc]">Across the widest part</dd></div>
          <div><dt className="text-[#e7ad61]">B. Body length</dt><dd className="mt-2 font-semibold text-white">{measurements ? formatMeasurement(measurements.bodyLengthInches) : "Not yet measured"}</dd><dd className="mt-1 text-sm text-[#d8cabc]">{half ? "Waist to hem" : "Bib to hem"}, excluding straps</dd></div>
          {template && <div><dt className="text-[#e7ad61]">C. Bib width</dt><dd className="mt-2 font-semibold text-white">{formatMeasurement(template.bibWidth)}</dd><dd className="mt-1 text-sm text-[#d8cabc]">Across the top of the {usesTemplate ? "bib" : "design-tool template"}</dd></div>}
        </dl>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#d8cabc]">{usesTemplate
        ? "Design-tool template dimensions, excluding straps. Individual handmade aprons may vary; confirm your fit with Crispin."
        : measurements ? "Body measured flat. Compare with an apron you already wear. Diagram is illustrative."
        : "Measurements are awaiting confirmation. Ask for the dimensions before choosing your fit."}</p>
      {!measurements && <Link href="/contact" className="mt-3 inline-block py-2 text-sm font-semibold text-[#e7ad61] underline underline-offset-4">Ask about fit</Link>}
    </section>
  );
}

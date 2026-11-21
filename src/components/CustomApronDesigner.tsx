"use client";

import {
  BadgePlus,
  BringToFront,
  ChevronDown,
  Copy,
  Mail,
  Move,
  Paintbrush,
  Pencil,
  Plus,
  RotateCcw,
  Scissors,
  SendToBack,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { getFirebaseFirestore, getFirebaseFunctions } from "@/lib/firebase";
import standardTemplates from "@/data/standard-apron-templates.json";

type ApronKind = "full" | "half";

type ApronTemplate = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  kind: ApronKind;
  totalWidth: number;
  totalHeight: number;
  bibWidth?: number;
  bodyHeight?: number;
  defaultColor: string;
};

type PocketTemplateId = "top-pocket" | "large-front-pocket" | "small-utility-pocket";

type PocketTemplate = {
  id: PocketTemplateId;
  name: string;
  shortName: string;
  width: number;
  height: number;
  defaultColor: string;
  defaultVerticalStitch?: boolean;
};

type PocketInstance = {
  id: string;
  templateId: PocketTemplateId;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  color: string;
  verticalStitch: boolean;
};

type PreferredContact = "Email" | "Phone";

type ContactForm = {
  name: string;
  email: string;
  phone: string;
  preferredContact: PreferredContact;
  useCase: string;
  notes: string;
};

type DesignerPanel = "apron-base" | "add-pocket" | "pocket-detail";

type SubmissionMode = "designer" | "upload";

type UploadedDesignImage = {
  name: string;
  mimeType: string;
  dataUrl: string;
};

type DragState = {
  id: string;
  offsetX: number;
  offsetY: number;
};

type ApronHardwarePoint = {
  x: number;
  y: number;
  r: number;
  type: "grommet" | "rivet";
};

const easeOut = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.82, ease: easeOut },
  },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const APRON_TEMPLATES: ApronTemplate[] = [
  {
    id: "x-back",
    name: "X-Back",
    shortName: "X-Back",
    description: '26" wide x 30.5" tall with a 10" bib.',
    kind: "full",
    totalWidth: 26,
    totalHeight: 30.5,
    bibWidth: 10,
    bodyHeight: 20,
    defaultColor: "#25211f",
  },
  {
    id: "standard-large",
    name: "Standard Large",
    shortName: "Std Large",
    description: '22.5" wide x 28" tall with a 9" bib.',
    kind: "full",
    ...standardTemplates.large,
    defaultColor: "#52665f",
  },
  {
    id: "standard-small",
    name: "Standard Small",
    shortName: "Std Small",
    description: '20.5" wide x 26" tall with a 7.5" bib.',
    kind: "full",
    ...standardTemplates.small,
    defaultColor: "#6d687f",
  },
  {
    id: "half-apron",
    name: "Half-Apron",
    shortName: "Half",
    description: '23" wide x 11" tall.',
    kind: "half",
    totalWidth: 23,
    totalHeight: 11,
    defaultColor: "#173551",
  },
];

const POCKET_TEMPLATES: PocketTemplate[] = [
  {
    id: "top-pocket",
    name: "Top Pocket",
    shortName: "Top",
    width: 5,
    height: 5.5,
    defaultColor: "#c57a2d",
  },
  {
    id: "large-front-pocket",
    name: "Large Front Pocket",
    shortName: "Front",
    width: 16,
    height: 8,
    defaultColor: "#7b1716",
    defaultVerticalStitch: true,
  },
  {
    id: "small-utility-pocket",
    name: "Small Utility Pocket",
    shortName: "Utility",
    width: 3.5,
    height: 5,
    defaultColor: "#0f4f56",
  },
];

const LEATHER_COLORS = [
  { name: "Black", value: "#181615" },
  { name: "Charcoal", value: "#4a4b48" },
  { name: "Slate", value: "#52665f" },
  { name: "Teal", value: "#0f5d65" },
  { name: "Navy", value: "#12345f" },
  { name: "Cobalt", value: "#0d4e9d" },
  { name: "Plum", value: "#603a7d" },
  { name: "Cognac", value: "#b6652e" },
  { name: "Chestnut", value: "#56301f" },
  { name: "Bone", value: "#c7a57e" },
  { name: "Oxblood", value: "#7b1716" },
  { name: "Red", value: "#a72a24" },
];

const INITIAL_TEMPLATE = APRON_TEMPLATES[1];

const initialForm: ContactForm = {
  name: "",
  email: "",
  phone: "",
  preferredContact: "Email",
  useCase: "",
  notes: "",
};

const CUSTOM_DESIGN_RECIPIENT_EMAIL = "upgrade@whidbey.com";
const CUSTOM_DESIGN_SUBMIT_TIMEOUT_MS = 30000;
const DESIGN_EMAIL_PNG_MAX_DIMENSION = 1200;
const DESIGN_EMAIL_PNG_MAX_DATA_URL_LENGTH = 850000;
const ACCEPTED_UPLOAD_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const pocketFieldLabelClass =
  "grid min-w-0 gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#e7ad61]";

const pocketFieldInputClass =
  "min-h-11 w-full min-w-0 rounded-md border border-white/14 bg-black/28 px-2 text-base font-normal normal-case tracking-[0] text-white outline-none transition focus:border-[#d6a25f] sm:px-3";

const contactFieldLabelClass =
  "grid min-w-0 gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#e7ad61]";

const contactFieldControlClass =
  "min-h-12 w-full min-w-0 rounded-md border border-white/14 bg-black/28 px-4 text-base font-normal normal-case tracking-[0] text-white outline-none transition focus:border-[#d6a25f]";

const contactSelectControlClass = `${contactFieldControlClass} appearance-none pr-14`;

const contactTextareaClass =
  "min-h-24 w-full min-w-0 rounded-md border border-white/14 bg-black/28 px-4 py-3 text-base font-normal normal-case tracking-[0] text-white outline-none transition focus:border-[#d6a25f]";

function formatInches(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getApronBibEdges(template: ApronTemplate) {
  const center = template.totalWidth / 2;
  const bibHalf = (template.bibWidth ?? template.totalWidth * 0.38) / 2;

  return {
    left: center - bibHalf,
    right: center + bibHalf,
  };
}

function getApronPath(template: ApronTemplate) {
  if (template.kind === "half") {
    return `M 0 0 H ${template.totalWidth} V ${template.totalHeight} H 0 Z`;
  }

  const width = template.totalWidth;
  const height = template.totalHeight;
  const shoulderY = getApronShoulderY(template);
  const { left: leftBib, right: rightBib } = getApronBibEdges(template);
  const isCrossback = template.id === "x-back";
  const topControlOffset = isCrossback ? 0.28 : 0.18;
  const lowerControlInset = isCrossback ? 2.85 : 3.65;
  const lowerControlY = isCrossback ? shoulderY * 0.9 : shoulderY * 0.84;
  const upperControlY = isCrossback ? shoulderY * 0.25 : shoulderY * 0.18;

  return [
    `M ${leftBib} 0`,
    `H ${rightBib}`,
    `C ${rightBib + topControlOffset} ${upperControlY}, ${
      width - lowerControlInset
    } ${lowerControlY}, ${width} ${shoulderY}`,
    `V ${height}`,
    "H 0",
    `V ${shoulderY}`,
    `C ${lowerControlInset} ${lowerControlY}, ${
      leftBib - topControlOffset
    } ${upperControlY}, ${leftBib} 0`,
    "Z",
  ].join(" ");
}

function getApronShoulderY(template: ApronTemplate) {
  return template.kind === "half"
    ? 0
    : template.totalHeight -
        (template.bodyHeight ?? template.totalHeight * 0.64) +
        (template.id === "x-back" ? 0.65 : 0.35);
}

function getApronHardwarePoints(template: ApronTemplate): ApronHardwarePoint[] {
  const width = template.totalWidth;

  if (template.kind === "half") {
    return [
      { x: 0.85, y: 0.52, r: 0.34, type: "grommet" },
      { x: width - 0.85, y: 0.52, r: 0.34, type: "grommet" },
    ];
  }

  const shoulderY = getApronShoulderY(template);
  const { left: leftBib, right: rightBib } = getApronBibEdges(template);

  if (template.id === "x-back") {
    return [
      { x: leftBib + 0.42, y: 0.72, r: 0.33, type: "grommet" },
      { x: rightBib - 0.42, y: 0.72, r: 0.33, type: "grommet" },
      { x: 0.72, y: shoulderY + 0.42, r: 0.33, type: "grommet" },
      { x: width - 0.72, y: shoulderY + 0.42, r: 0.33, type: "grommet" },
    ];
  }

  return [
    { x: leftBib + 0.5, y: 0.85, r: 0.22, type: "rivet" },
    { x: leftBib + 0.5, y: 1.95, r: 0.22, type: "rivet" },
    { x: rightBib - 0.5, y: 0.85, r: 0.22, type: "rivet" },
    { x: rightBib - 0.5, y: 1.95, r: 0.22, type: "rivet" },
    { x: 0.72, y: shoulderY + 0.42, r: 0.31, type: "grommet" },
    { x: width - 0.72, y: shoulderY + 0.42, r: 0.31, type: "grommet" },
  ];
}

function ApronHardwareMarkers({ apron }: { apron: ApronTemplate }) {
  return (
    <>
      {getApronHardwarePoints(apron).map((point, index) => (
        <g key={`${point.type}-${index}`}>
          <circle cx={point.x} cy={point.y} fill="#d6a25f" r={point.r} />
          {point.type === "grommet" ? (
            <circle
              cx={point.x}
              cy={point.y}
              fill="#1b120c"
              fillOpacity="0.82"
              r={point.r * 0.48}
            />
          ) : (
            <circle
              cx={point.x - point.r * 0.2}
              cy={point.y - point.r * 0.2}
              fill="#fff3c6"
              fillOpacity="0.6"
              r={point.r * 0.28}
            />
          )}
        </g>
      ))}
    </>
  );
}

function buildApronHardwareSvg(apron: ApronTemplate) {
  return getApronHardwarePoints(apron)
    .map((point) => {
      const detail =
        point.type === "grommet"
          ? `<circle cx="${point.x}" cy="${point.y}" r="${point.r * 0.48}" fill="#1b120c" fill-opacity="0.82" />`
          : `<circle cx="${point.x - point.r * 0.2}" cy="${
              point.y - point.r * 0.2
            }" r="${point.r * 0.28}" fill="#fff3c6" fill-opacity="0.6" />`;

      return `<g><circle cx="${point.x}" cy="${point.y}" r="${point.r}" fill="#d6a25f" />${detail}</g>`;
    })
    .join("");
}

function getDefaultPocketPosition(apron: ApronTemplate, pocket: PocketTemplate) {
  const margin = 0.55;
  const centerX = (apron.totalWidth - pocket.width) / 2;

  if (apron.kind === "half") {
    if (pocket.id === "large-front-pocket") {
      return {
        x: centerX,
        y: clamp((apron.totalHeight - pocket.height) / 2, margin, apron.totalHeight),
      };
    }

    return {
      x:
        pocket.id === "top-pocket"
          ? margin + 1.4
          : apron.totalWidth - pocket.width - margin - 1.4,
      y: clamp((apron.totalHeight - pocket.height) / 2, margin, apron.totalHeight),
    };
  }

  const shoulderY = getApronShoulderY(apron);

  if (pocket.id === "top-pocket") {
    return {
      x: centerX,
      y: clamp(shoulderY + 1.25, margin, apron.totalHeight - pocket.height - margin),
    };
  }

  if (pocket.id === "small-utility-pocket") {
    return {
      x: clamp(apron.totalWidth * 0.63, margin, apron.totalWidth - pocket.width - margin),
      y: clamp(apron.totalHeight - pocket.height - 10.2, margin, apron.totalHeight - pocket.height - margin),
    };
  }

  return {
    x: centerX,
    y: clamp(apron.totalHeight - pocket.height - 3.2, margin, apron.totalHeight - pocket.height - margin),
  };
}

function createPocket(
  template: PocketTemplate,
  apron: ApronTemplate,
  id: string,
  offset = 0,
): PocketInstance {
  const position = getDefaultPocketPosition(apron, template);

  return clampPocket(
    {
      id,
      templateId: template.id,
      name: template.name,
      width: template.width,
      height: template.height,
      x: position.x + offset,
      y: position.y + offset,
      color: template.defaultColor,
      verticalStitch: Boolean(template.defaultVerticalStitch),
    },
    apron,
  );
}

function orderDefaultPocketLayersForApron(
  pockets: PocketInstance[],
  apron: ApronTemplate,
) {
  if (apron.kind !== "half") {
    return pockets;
  }

  return [
    ...pockets.filter((pocket) => pocket.templateId === "large-front-pocket"),
    ...pockets.filter((pocket) => pocket.templateId !== "large-front-pocket"),
  ];
}

function makeStarterPockets(apron: ApronTemplate) {
  const topPocket = createPocket(POCKET_TEMPLATES[0], apron, "starter-top-pocket");
  const frontPocket = createPocket(
    POCKET_TEMPLATES[1],
    apron,
    "starter-front-pocket",
  );
  const utilityPocket = createPocket(
    POCKET_TEMPLATES[2],
    apron,
    "starter-utility-pocket",
  );

  if (apron.kind === "half") {
    return orderDefaultPocketLayersForApron(
      [topPocket, frontPocket, utilityPocket],
      apron,
    );
  }

  const frontX = (apron.totalWidth - frontPocket.width) / 2;
  const frontY = apron.totalHeight - frontPocket.height - 3;

  return [
    clampPocket(
      {
        ...topPocket,
        x: frontX + 1.55,
        y: frontY - 2.35,
      },
      apron,
    ),
    clampPocket(
      {
        ...frontPocket,
        x: frontX,
        y: frontY,
      },
      apron,
    ),
    clampPocket(
      {
        ...utilityPocket,
        x: frontX + frontPocket.width - utilityPocket.width - 2.15,
        y: frontY + 1.45,
      },
      apron,
    ),
  ];
}

function createPocketId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `pocket-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampPocket(pocket: PocketInstance, apron: ApronTemplate) {
  const margin = 0.35;
  const width = Number.isFinite(pocket.width) ? pocket.width : 0;
  const height = Number.isFinite(pocket.height) ? pocket.height : 0;

  return {
    ...pocket,
    width,
    height,
    x: clamp(pocket.x, margin, Math.max(margin, apron.totalWidth - width - margin)),
    y: clamp(pocket.y, margin, Math.max(margin, apron.totalHeight - height - margin)),
  };
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getColorName(value: string) {
  return (
    LEATHER_COLORS.find(
      (color) => color.value.toLowerCase() === value.toLowerCase(),
    )?.name ?? value
  );
}

function getPocketStitchPath(width: number, height: number) {
  const inset = 0.18;
  const right = Math.max(inset + 0.1, width - inset);
  const bottom = Math.max(inset + 0.1, height - inset);

  return `M ${inset} ${inset} V ${bottom} H ${right} V ${inset}`;
}

function getPocketVerticalStitchStart(height: number) {
  return Math.min(0.62, Math.max(0.22, height * 0.32));
}

function PocketTemplatePreview({ template }: { template: PocketTemplate }) {
  const maxWidth = 5.8;
  const maxHeight = 4.2;
  const padding = 0.45;
  const scale = Math.min(maxWidth / template.width, maxHeight / template.height);
  const width = template.width * scale;
  const height = template.height * scale;
  const x = (maxWidth + padding * 2 - width) / 2;
  const y = (maxHeight + padding * 2 - height) / 2;
  const verticalStitchStart = getPocketVerticalStitchStart(height);

  return (
    <span
      aria-hidden="true"
      className="inline-flex h-16 w-[4.5rem] shrink-0 items-center justify-center rounded-md border border-white/12 bg-[#140d09] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
    >
      <svg
        className="h-12 w-16"
        preserveAspectRatio="xMidYMid meet"
        viewBox={`0 0 ${maxWidth + padding * 2} ${maxHeight + padding * 2}`}
      >
        <g transform={`translate(${x} ${y})`}>
          <rect
            fill={template.defaultColor}
            height={height}
            rx="0.18"
            stroke="#23150f"
            strokeWidth="0.08"
            width={width}
          />
          <path
            d={getPocketStitchPath(width, height)}
            fill="none"
            stroke="#f6d9ad"
            strokeDasharray="0.18 0.11"
            strokeOpacity="0.68"
            strokeWidth="0.055"
          />
          {template.defaultVerticalStitch ? (
            <line
              stroke="#f6d9ad"
              strokeDasharray="0.18 0.11"
              strokeOpacity="0.82"
              strokeWidth="0.065"
              x1={width / 2}
              x2={width / 2}
              y1={verticalStitchStart}
              y2={Math.max(verticalStitchStart + 0.1, height - 0.22)}
            />
          ) : null}
        </g>
      </svg>
    </span>
  );
}

function ApronPanelPreview({
  apron,
  apronColor,
  pockets = [],
  selectedPocketId,
  title,
}: {
  apron: ApronTemplate;
  apronColor: string;
  pockets?: PocketInstance[];
  selectedPocketId?: string;
  title: string;
}) {
  const apronPath = getApronPath(apron);
  const viewBox = `-1.35 -1 ${apron.totalWidth + 2.7} ${
    apron.totalHeight + 2.45
  }`;
  const filterId = selectedPocketId
    ? "pocket-detail-preview-leather-noise"
    : "apron-base-preview-leather-noise";

  return (
    <div className="rounded-md border border-white/12 bg-black/20 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e7ad61]">
          {title}
        </p>
        <span className="text-xs uppercase tracking-[0.14em] text-[#cdbdaa]">
          {formatInches(apron.totalWidth)} x {formatInches(apron.totalHeight)} in
        </span>
      </div>
      <svg
        aria-label={
          selectedPocketId
            ? `${title} showing selected pocket on ${apron.name}`
            : `${title} showing ${apron.name} apron base`
        }
        className="h-52 w-full sm:h-60"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox={viewBox}
      >
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              baseFrequency="0.78"
              numOctaves="3"
              result="noise"
              seed="7"
              type="fractalNoise"
            />
            <feColorMatrix in="noise" result="grain" type="saturate" values="0" />
            <feBlend in="SourceGraphic" in2="grain" mode="multiply" />
          </filter>
        </defs>
        <rect
          fill="#080604"
          height={apron.totalHeight + 2.45}
          rx="0.9"
          width={apron.totalWidth + 2.7}
          x="-1.35"
          y="-1"
        />
        <path
          d={apronPath}
          fill={apronColor}
          filter={`url(#${filterId})`}
          stroke="#d6a25f"
          strokeWidth="0.12"
        />
        <path
          d={apronPath}
          fill="none"
          stroke="#f4d6ab"
          strokeDasharray="0.18 0.12"
          strokeOpacity="0.45"
          strokeWidth="0.055"
        />
        <ApronHardwareMarkers apron={apron} />
        {pockets.map((pocket) => {
          const selected = pocket.id === selectedPocketId;
          const verticalStitchStart = getPocketVerticalStitchStart(pocket.height);

          return (
            <g
              key={pocket.id}
              opacity={selectedPocketId && !selected ? 0.42 : 1}
              transform={`translate(${pocket.x} ${pocket.y})`}
            >
              <rect
                fill={pocket.color}
                height={pocket.height}
                rx="0.18"
                stroke={selected ? "#f0bc72" : "#23150f"}
                strokeWidth={selected ? 0.18 : 0.08}
                width={pocket.width}
              />
              <path
                d={getPocketStitchPath(pocket.width, pocket.height)}
                fill="none"
                stroke="#f6d9ad"
                strokeDasharray="0.18 0.11"
                strokeOpacity="0.62"
                strokeWidth="0.055"
              />
              {pocket.verticalStitch ? (
                <line
                  stroke="#f6d9ad"
                  strokeDasharray="0.18 0.11"
                  strokeOpacity="0.8"
                  strokeWidth="0.065"
                  x1={pocket.width / 2}
                  x2={pocket.width / 2}
                  y1={verticalStitchStart}
                  y2={Math.max(verticalStitchStart + 0.1, pocket.height - 0.22)}
                />
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function getLayerLabel(index: number, total: number) {
  if (index === total - 1) {
    return `Layer ${index + 1} (top)`;
  }

  if (index === 0) {
    return "Layer 1 (back)";
  }

  return `Layer ${index + 1}`;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function buildPocketSvg(pocket: PocketInstance, selected = false) {
  const stitchStroke = "#f6d9ad";
  const selectedStroke = selected ? "#f0bc72" : "#23150f";
  const stitchDash = "0.18 0.11";
  const verticalStitchStart = getPocketVerticalStitchStart(pocket.height);

  return `
    <g transform="translate(${pocket.x} ${pocket.y})">
      <rect width="${pocket.width}" height="${pocket.height}" rx="0.18" fill="${escapeXml(pocket.color)}" stroke="${selectedStroke}" stroke-width="${selected ? 0.16 : 0.08}" />
      <path d="${getPocketStitchPath(pocket.width, pocket.height)}" fill="none" stroke="${stitchStroke}" stroke-opacity="0.62" stroke-width="0.055" stroke-dasharray="${stitchDash}" />
      ${
        pocket.verticalStitch
          ? `<line x1="${pocket.width / 2}" y1="${verticalStitchStart}" x2="${pocket.width / 2}" y2="${Math.max(verticalStitchStart + 0.1, pocket.height - 0.22)}" stroke="${stitchStroke}" stroke-opacity="0.8" stroke-width="0.065" stroke-dasharray="${stitchDash}" />`
          : ""
      }
    </g>
  `;
}

function buildDesignerSvgMarkup(
  apron: ApronTemplate,
  apronColor: string,
  pockets: PocketInstance[],
) {
  const path = getApronPath(apron);
  const width = apron.totalWidth;
  const height = apron.totalHeight;
  const viewBox = `-1.5 -1.2 ${width + 3.4} ${height + 3.8}`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}in" height="${height}in" role="img" aria-label="${escapeXml(apron.name)} custom apron layout">
  <defs>
    <filter id="leather-noise" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="3" seed="7" result="noise" />
      <feColorMatrix in="noise" type="saturate" values="0" result="grain" />
      <feBlend in="SourceGraphic" in2="grain" mode="multiply" />
    </filter>
  </defs>
  <rect x="-1.5" y="-1.2" width="${width + 3.4}" height="${height + 3.8}" fill="#080604" />
  <path d="${path}" fill="${escapeXml(apronColor)}" filter="url(#leather-noise)" stroke="#d6a25f" stroke-width="0.12" />
  <path d="${path}" fill="none" stroke="#f4d6ab" stroke-opacity="0.45" stroke-width="0.055" stroke-dasharray="0.18 0.12" />
  ${buildApronHardwareSvg(apron)}
  ${pockets.map((pocket) => buildPocketSvg(pocket)).join("")}
  <text x="${width / 2}" y="${height + 1.15}" fill="#f4d6ab" font-family="Arial, sans-serif" font-size="0.55" text-anchor="middle">${formatInches(width)} in wide</text>
  <text x="${width + 0.92}" y="${height / 2}" fill="#f4d6ab" font-family="Arial, sans-serif" font-size="0.55" text-anchor="middle" transform="rotate(90 ${width + 0.92} ${height / 2})">${formatInches(height)} in tall</text>
</svg>`.trim();
}

function getSvgViewBoxSize(svgMarkup: string) {
  const viewBoxMatch = svgMarkup.match(/\bviewBox="([^"]+)"/);

  if (!viewBoxMatch) {
    return null;
  }

  const [, , width, height] = viewBoxMatch[1]
    .trim()
    .split(/\s+/)
    .map((value) => Number(value));

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

function buildEmailSafeSvgMarkup(svgMarkup: string) {
  return svgMarkup
    .replace(/<filter id="leather-noise"[\s\S]*?<\/filter>/, "")
    .replace(/\sfilter="url\(#leather-noise\)"/g, "");
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Design image could not be rendered."));
    image.src = src;
  });
}

async function buildDesignerPngDataUrl(svgMarkup: string) {
  if (typeof window === "undefined") {
    return "";
  }

  const viewBoxSize = getSvgViewBoxSize(svgMarkup);

  if (!viewBoxSize) {
    return "";
  }

  const scale = Math.min(
    DESIGN_EMAIL_PNG_MAX_DIMENSION / viewBoxSize.width,
    DESIGN_EMAIL_PNG_MAX_DIMENSION / viewBoxSize.height,
  );
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return "";
  }

  canvas.width = Math.max(1, Math.round(viewBoxSize.width * scale));
  canvas.height = Math.max(1, Math.round(viewBoxSize.height * scale));

  const blob = new Blob([buildEmailSafeSvgMarkup(svgMarkup)], {
    type: "image/svg+xml;charset=utf-8",
  });
  const imageUrl = URL.createObjectURL(blob);

  try {
    const image = await loadImage(imageUrl);

    context.fillStyle = "#080604";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/png");

    return dataUrl.length <= DESIGN_EMAIL_PNG_MAX_DATA_URL_LENGTH ? dataUrl : "";
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function buildDesignPayload(
  apron: ApronTemplate,
  apronColor: string,
  pockets: PocketInstance[],
) {
  return {
    apron: {
      id: apron.id,
      name: apron.name,
      kind: apron.kind,
      totalWidth: apron.totalWidth,
      totalHeight: apron.totalHeight,
      bibWidth: apron.bibWidth ?? null,
      bodyHeight: apron.bodyHeight ?? null,
      color: apronColor,
      colorName: getColorName(apronColor),
    },
    pockets: pockets.map((pocket, index) => ({
      number: index + 1,
      id: pocket.id,
      type: pocket.templateId,
      name: pocket.name,
      width: pocket.width,
      height: pocket.height,
      x: Number(pocket.x.toFixed(2)),
      y: Number(pocket.y.toFixed(2)),
      color: pocket.color,
      colorName: getColorName(pocket.color),
      verticalStitch: pocket.verticalStitch,
      layer: index + 1,
      layerName: getLayerLabel(index, pockets.length),
    })),
  };
}

function getPreferredContact(
  email: string,
  phone: string,
  preferredContact: string,
): PreferredContact {
  const hasEmail = Boolean(email.trim());
  const hasPhone = Boolean(phone.trim());

  if (hasEmail && !hasPhone) {
    return "Email";
  }

  if (hasPhone && !hasEmail) {
    return "Phone";
  }

  return preferredContact === "Phone" ? "Phone" : "Email";
}

function buildFallbackEmailHref(
  form: ContactForm,
  design: ReturnType<typeof buildDesignPayload>,
  submissionMode: SubmissionMode,
  uploadedDesignImage: UploadedDesignImage | null,
) {
  const email = form.email.trim();
  const phone = form.phone.trim();
  const useCase = form.useCase.trim();
  const notes = form.notes.trim();
  const preferredContact = getPreferredContact(email, phone, form.preferredContact);
  const isUploadSubmission = submissionMode === "upload";
  const pocketSummary = design.pockets.length
    ? design.pockets
        .map(
          (pocket) =>
            `${pocket.number}. ${pocket.name} (${pocket.layerName}) - ${formatInches(
              pocket.width,
            )} in wide x ${formatInches(pocket.height)} in high, X ${formatInches(
              pocket.x,
            )}, Y ${formatInches(pocket.y)}, ${pocket.colorName}, center stitch: ${
              pocket.verticalStitch ? "yes" : "no"
            }`,
        )
        .join("\n")
    : "No pockets selected.";

  const body = [
    "Custom apron design request",
    "",
    "Contact",
    `Name: ${form.name.trim()}`,
    email ? `Email: ${email}` : "",
    phone ? `Phone: ${phone}` : "",
    `Preferred Contact: ${preferredContact}`,
    "",
    isUploadSubmission ? "Uploaded Image" : "Apron",
    isUploadSubmission
      ? `Image: ${uploadedDesignImage?.name ?? "Uploaded design image"}`
      : `Base: ${design.apron.name}`,
    isUploadSubmission ? "" : `Body Color: ${design.apron.colorName}`,
    isUploadSubmission
      ? ""
      : `Size: ${formatInches(design.apron.totalWidth)} in wide x ${formatInches(
          design.apron.totalHeight,
        )} in tall`,
    !isUploadSubmission && design.apron.bibWidth
      ? `Bib Width: ${formatInches(design.apron.bibWidth)} in`
      : "",
    "",
    "Pocket Layout",
    isUploadSubmission ? "See uploaded image." : pocketSummary,
    "",
    ...(useCase ? ["Intended Use", useCase, ""] : []),
    ...(notes ? ["Notes", notes, ""] : []),
    "Design Image",
    isUploadSubmission
      ? "The customer uploaded an image for this request. If this fallback email is used, please attach the image manually."
      : "The website generated an SVG design image for this request. If this fallback email is used, please include a screenshot of the design board.",
  ].filter(Boolean);

  return `mailto:${CUSTOM_DESIGN_RECIPIENT_EMAIL}?subject=${encodeURIComponent(
    `Custom Apron Design - ${form.name.trim() || "New Request"}`,
  )}&body=${encodeURIComponent(body.join("\n"))}`;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function CustomApronDesigner() {
  const reduceMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [submissionMode, setSubmissionMode] =
    useState<SubmissionMode>("designer");
  const [selectedApronId, setSelectedApronId] = useState(INITIAL_TEMPLATE.id);
  const [apronColor, setApronColor] = useState(INITIAL_TEMPLATE.defaultColor);
  const [pockets, setPockets] = useState<PocketInstance[]>(() =>
    makeStarterPockets(INITIAL_TEMPLATE),
  );
  const [activePocketId, setActivePocketId] = useState("starter-front-pocket");
  const [activeDesignerPanel, setActiveDesignerPanel] =
    useState<DesignerPanel | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [form, setForm] = useState<ContactForm>(initialForm);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [showFallbackEmail, setShowFallbackEmail] = useState(false);
  const [uploadedDesignImage, setUploadedDesignImage] =
    useState<UploadedDesignImage | null>(null);
  const [uploadError, setUploadError] = useState("");

  const selectedApron =
    APRON_TEMPLATES.find((template) => template.id === selectedApronId) ??
    INITIAL_TEMPLATE;

  const activePocket =
    pockets.find((pocket) => pocket.id === activePocketId) ?? null;
  const activeLayerIndex = activePocket
    ? pockets.findIndex((pocket) => pocket.id === activePocket.id)
    : -1;
  const hasContactEmail = Boolean(form.email.trim());
  const hasContactPhone = Boolean(form.phone.trim());
  const preferredContactOptions = useMemo<PreferredContact[]>(() => {
    if (hasContactEmail && !hasContactPhone) {
      return ["Email"];
    }

    if (hasContactPhone && !hasContactEmail) {
      return ["Phone"];
    }

    return ["Email", "Phone"];
  }, [hasContactEmail, hasContactPhone]);
  const isPreferredContactLocked = preferredContactOptions.length === 1;
  const preferredContactValue = getPreferredContact(
    form.email,
    form.phone,
    form.preferredContact,
  );

  const designPayload = useMemo(
    () => buildDesignPayload(selectedApron, apronColor, pockets),
    [selectedApron, apronColor, pockets],
  );

  const svgMarkup = useMemo(
    () => buildDesignerSvgMarkup(selectedApron, apronColor, pockets),
    [selectedApron, apronColor, pockets],
  );

  const fallbackEmailHref = useMemo(
    () =>
      showFallbackEmail
        ? buildFallbackEmailHref(
            form,
            designPayload,
            submissionMode,
            uploadedDesignImage,
          )
        : "",
    [showFallbackEmail, form, designPayload, submissionMode, uploadedDesignImage],
  );

  const viewBox = useMemo(
    () =>
      `-1.5 -1.2 ${selectedApron.totalWidth + 3.4} ${
        selectedApron.totalHeight + 3.8
      }`,
    [selectedApron],
  );

  const getSvgPoint = useCallback(
    (event: ReactPointerEvent<SVGSVGElement | SVGGElement>) => {
      const svg = svgRef.current;
      const matrix = svg?.getScreenCTM();

      if (!svg || !matrix) {
        return null;
      }

      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;

      return point.matrixTransform(matrix.inverse());
    },
    [],
  );

  const updateField = <Field extends keyof ContactForm>(
    field: Field,
    value: ContactForm[Field],
  ) => {
    setForm((current) => {
      const next = { ...current, [field]: value } as ContactForm;

      if (
        field === "email" ||
        field === "phone" ||
        field === "preferredContact"
      ) {
        return {
          ...next,
          preferredContact: getPreferredContact(
            next.email,
            next.phone,
            next.preferredContact,
          ),
        };
      }

      return next;
    });

    if (status !== "idle") {
      setStatus("idle");
      setMessage("");
      setShowFallbackEmail(false);
    }
  };

  const updateSubmissionMode = (mode: SubmissionMode) => {
    setSubmissionMode(mode);
    setActiveDesignerPanel(null);

    if (status !== "idle") {
      setStatus("idle");
      setMessage("");
      setShowFallbackEmail(false);
    }
  };

  const handleUploadedDesignImageChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    setUploadError("");

    if (!file) {
      setUploadedDesignImage(null);
      return;
    }

    if (!ACCEPTED_UPLOAD_IMAGE_TYPES.includes(file.type)) {
      setUploadedDesignImage(null);
      setUploadError("Upload a PNG, JPG, or WebP image.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";

      if (
        !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)
      ) {
        setUploadedDesignImage(null);
        setUploadError("That image could not be prepared for email.");
        event.target.value = "";
        return;
      }

      if (dataUrl.length > DESIGN_EMAIL_PNG_MAX_DATA_URL_LENGTH) {
        setUploadedDesignImage(null);
        setUploadError("Use a smaller image so it can be emailed with the form.");
        event.target.value = "";
        return;
      }

      setUploadedDesignImage({
        name: file.name || "uploaded-apron-design",
        mimeType: file.type,
        dataUrl,
      });

      if (status !== "idle") {
        setStatus("idle");
        setMessage("");
        setShowFallbackEmail(false);
      }
    };

    reader.onerror = () => {
      setUploadedDesignImage(null);
      setUploadError("That image could not be read.");
      event.target.value = "";
    };

    reader.readAsDataURL(file);
  };

  const selectPocket = useCallback((pocketId: string) => {
    setActivePocketId(pocketId);
  }, []);

  const openPocketDetail = useCallback((pocketId: string) => {
    setActivePocketId(pocketId);
    setActiveDesignerPanel("pocket-detail");
  }, []);

  const updateActivePocket = (patch: Partial<PocketInstance>) => {
    if (!activePocketId) return;

    setPockets((current) =>
      current.map((pocket) =>
        pocket.id === activePocketId
          ? clampPocket({ ...pocket, ...patch }, selectedApron)
          : pocket,
      ),
    );
  };

  const selectApron = (template: ApronTemplate) => {
    setSelectedApronId(template.id);
    setApronColor(template.defaultColor);
    setPockets((current) => {
      const nextPockets = (current.length
        ? current
        : makeStarterPockets(template)
      ).map((pocket) => clampPocket(pocket, template));

      return orderDefaultPocketLayersForApron(nextPockets, template);
    });
  };

  const addPocket = (template: PocketTemplate) => {
    const duplicateCount = pockets.filter(
      (pocket) => pocket.templateId === template.id,
    ).length;
    const pocket = createPocket(
      template,
      selectedApron,
      createPocketId(),
      duplicateCount * 0.45,
    );

    setPockets((current) =>
      selectedApron.kind === "half" &&
      pocket.templateId === "large-front-pocket"
        ? [pocket, ...current]
        : [...current, pocket],
    );
    selectPocket(pocket.id);
    setActiveDesignerPanel(null);
  };

  const duplicateActivePocket = () => {
    if (!activePocket) return;

    const pocket = clampPocket(
      {
        ...activePocket,
        id: createPocketId(),
        x: activePocket.x + 0.55,
        y: activePocket.y + 0.55,
      },
      selectedApron,
    );

    setPockets((current) =>
      selectedApron.kind === "half" &&
      pocket.templateId === "large-front-pocket"
        ? [pocket, ...current]
        : [...current, pocket],
    );
    selectPocket(pocket.id);
  };

  const moveActivePocketToLayer = (layerIndex: number) => {
    if (!activePocketId) return;

    setPockets((current) => {
      const currentIndex = current.findIndex(
        (pocket) => pocket.id === activePocketId,
      );

      if (currentIndex === -1) {
        return current;
      }

      const next = [...current];
      const [pocket] = next.splice(currentIndex, 1);
      next.splice(clamp(Math.round(layerIndex), 0, next.length), 0, pocket);

      return next;
    });
  };

  const removeActivePocket = useCallback(() => {
    if (!activePocketId) return;

    setPockets((current) => {
      const next = current.filter((pocket) => pocket.id !== activePocketId);
      const nextActivePocketId = next.at(-1)?.id ?? "";

      setActivePocketId(nextActivePocketId);

      return next;
    });
  }, [activePocketId]);

  const resetDesign = () => {
    const next = makeStarterPockets(selectedApron);
    setPockets(next);
    setActivePocketId("starter-front-pocket");
    setApronColor(selectedApron.defaultColor);
  };

  const beginPocketDrag = (
    event: ReactPointerEvent<SVGGElement>,
    pocket: PocketInstance,
  ) => {
    const point = getSvgPoint(event);

    if (!point) return;

    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some synthetic or older touch inputs do not support pointer capture.
    }
    selectPocket(pocket.id);
    setDragState({
      id: pocket.id,
      offsetX: point.x - pocket.x,
      offsetY: point.y - pocket.y,
    });
  };

  const movePocket = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragState) return;

    const point = getSvgPoint(event);

    if (!point) return;

    setPockets((current) =>
      current.map((pocket) => {
        if (pocket.id !== dragState.id) {
          return pocket;
        }

        return clampPocket(
          {
            ...pocket,
            x: point.x - dragState.offsetX,
            y: point.y - dragState.offsetY,
          },
          selectedApron,
        );
      }),
    );
  };

  const endPocketDrag = () => {
    setDragState(null);
  };

  useEffect(() => {
    const handleDeleteKey = (event: KeyboardEvent) => {
      if (
        event.key !== "Delete" ||
        !activePocketId ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      removeActivePocket();
    };

    window.addEventListener("keydown", handleDeleteKey);

    return () => window.removeEventListener("keydown", handleDeleteKey);
  }, [activePocketId, removeActivePocket]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const preferredContact = getPreferredContact(
      email,
      phone,
      form.preferredContact,
    );
    const isUploadSubmission = submissionMode === "upload";

    if (!name || (!email && !phone)) {
      setStatus("error");
      setShowFallbackEmail(false);
      setMessage("Please include your name and either an email or phone number.");
      return;
    }

    if (isUploadSubmission && !uploadedDesignImage) {
      setStatus("error");
      setShowFallbackEmail(false);
      setMessage("Please upload an image of the apron design.");
      return;
    }

    setStatus("submitting");
    setMessage("");
    setShowFallbackEmail(false);

    let designPngDataUrl = "";

    if (!isUploadSubmission) {
      try {
        designPngDataUrl = await buildDesignerPngDataUrl(svgMarkup);
      } catch (error) {
        console.warn("Custom apron PNG attachment could not be generated.", error);
      }
    }

    const submission = {
      name,
      email,
      phone,
      preferredContact,
      useCase: form.useCase.trim(),
      notes: form.notes.trim(),
      submissionMode: isUploadSubmission ? "uploaded-image" : "design-tool",
      design: isUploadSubmission ? { apron: {}, pockets: [] } : designPayload,
      designImage:
        isUploadSubmission && uploadedDesignImage
          ? {
              filename: uploadedDesignImage.name,
              mimeType: uploadedDesignImage.mimeType,
              sourceField: "uploadedDesignImage.dataUrl",
              dataUrl: uploadedDesignImage.dataUrl,
            }
          : designPngDataUrl
            ? {
                filename: "custom-apron-design.png",
                mimeType: "image/png",
                sourceField: "designImage.dataUrl",
                dataUrl: designPngDataUrl,
                fallbackFilename: "custom-apron-design.svg",
              }
            : {
                filename: "custom-apron-design.svg",
                mimeType: "image/svg+xml",
                sourceField: "svgMarkup",
              },
      svgMarkup: isUploadSubmission ? "" : svgMarkup,
      pocketCount: isUploadSubmission ? 0 : pockets.length,
      source: "custom-apron-designer",
    };

    try {
      const functions = await withTimeout(
        getFirebaseFunctions(),
        CUSTOM_DESIGN_SUBMIT_TIMEOUT_MS,
        "Firebase Functions initialization timed out.",
      );

      if (!functions) {
        throw new Error("Firebase Functions unavailable");
      }

      const { httpsCallable } = await withTimeout(
        import("firebase/functions"),
        CUSTOM_DESIGN_SUBMIT_TIMEOUT_MS,
        "Firebase Functions tools did not load.",
      );
      const submitCustomApronDesign = httpsCallable(
        functions,
        "submitCustomApronDesign",
      );

      await withTimeout(
        submitCustomApronDesign(submission),
        CUSTOM_DESIGN_SUBMIT_TIMEOUT_MS,
        "Custom design email handoff timed out.",
      );

      setForm(initialForm);
      setUploadedDesignImage(null);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
      setStatus("success");
      setMessage(
        `Your custom apron design was sent to ${CUSTOM_DESIGN_RECIPIENT_EMAIL}.`,
      );
    } catch (primaryError) {
      console.warn(
        "Custom apron callable submission failed; trying Firestore queue.",
        primaryError,
      );

      try {
        const db = await withTimeout(
          getFirebaseFirestore(),
          CUSTOM_DESIGN_SUBMIT_TIMEOUT_MS,
          "Firebase Firestore initialization timed out.",
        );

        if (!db) {
          throw new Error("Firestore unavailable");
        }

        const { addDoc, collection, serverTimestamp } = await withTimeout(
          import("firebase/firestore"),
          CUSTOM_DESIGN_SUBMIT_TIMEOUT_MS,
          "Firebase Firestore tools did not load.",
        );

        await withTimeout(
          addDoc(collection(db, "customApronDesigns"), {
            ...submission,
            emailStatus: "pending",
            createdAt: serverTimestamp(),
          }),
          CUSTOM_DESIGN_SUBMIT_TIMEOUT_MS,
          "Custom design submission timed out.",
        );

        setForm(initialForm);
        setUploadedDesignImage(null);
        if (uploadInputRef.current) {
          uploadInputRef.current.value = "";
        }
        setStatus("success");
        setMessage(
          `Your custom apron design was sent to ${CUSTOM_DESIGN_RECIPIENT_EMAIL}.`,
        );
      } catch (fallbackError) {
        console.warn("Custom apron design submission failed.", fallbackError);
        setStatus("error");
        setShowFallbackEmail(true);
        setMessage(
          "The website email handoff did not finish. You can open an email draft with the details, or try sending again.",
        );
      }
    }
  };

  return (
    <motion.section
      className="mx-auto grid max-w-[116rem] gap-8"
      variants={stagger}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.14 }}
    >
      <motion.div
        className="grid gap-6"
        variants={fadeUp}
      >
        <div className="rounded-lg border border-white/12 bg-[#090604]/88 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur-md sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e7ad61]">
            Choose Design Method
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              {
                mode: "designer" as const,
                label: "Use Design Tool",
                copy: "Create a mockup with apron, leather, and pocket controls.",
                Icon: Scissors,
              },
              {
                mode: "upload" as const,
                label: "Upload Image",
                copy: "Send your own drawing, photo, or marked-up apron idea.",
                Icon: Upload,
              },
            ].map((option) => {
              const selected = submissionMode === option.mode;
              const Icon = option.Icon;

              return (
                <button
                  aria-pressed={selected}
                  className={`flex min-h-28 items-start gap-4 rounded-md border p-4 text-left transition duration-200 ${
                    selected
                      ? "border-[#d6a25f] bg-[#d6a25f]/12 text-white shadow-[0_0_26px_rgba(214,162,95,0.13)]"
                      : "border-white/12 bg-black/20 text-[#d8cabc] hover:border-[#d6a25f]/60 hover:bg-[#d6a25f]/10 hover:text-white"
                  }`}
                  key={option.mode}
                  onClick={() => updateSubmissionMode(option.mode)}
                  type="button"
                >
                  <span className="inline-flex size-11 flex-none items-center justify-center rounded-md border border-[#d6a25f]/55 text-[#e7ad61]">
                    <Icon size={20} strokeWidth={1.55} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold uppercase tracking-[0.16em] text-[#e7ad61]">
                      {option.label}
                    </span>
                    <span className="mt-2 block text-sm leading-6">
                      {option.copy}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {submissionMode === "designer" ? (
        <div className="rounded-lg border border-white/12 bg-[#090604]/88 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur-md sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e7ad61]">
                Design Board
              </p>
              <h3 className="font-display mt-2 text-3xl font-semibold text-white">
                {selectedApron.name}
              </h3>
            </div>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#d6a25f]/55 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#e7ad61] transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a25f]/10 hover:text-white"
              onClick={resetDesign}
              type="button"
            >
              <RotateCcw size={16} aria-hidden="true" />
              Reset
            </button>
          </div>

          <div className="mb-5 grid gap-3 border-y border-white/10 py-3 text-sm text-[#d8cabc] sm:grid-cols-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-[#d6a25f]/50 bg-[#050403]/78 text-[#e7ad61]">
                <Pencil size={17} aria-hidden="true" />
              </span>
              <span className="leading-5">Edit apron base, size, and body color.</span>
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-[#d6a25f]/50 bg-[#050403]/78 text-[#f6d9ad]">
                <span
                  aria-hidden="true"
                  className="relative grid h-7 w-7 place-items-center overflow-hidden rounded-[0.24rem] rounded-t-[0.16rem] bg-[#7b1716] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] before:pointer-events-none before:absolute before:inset-x-1 before:bottom-1 before:top-1 before:rounded-b-[0.16rem] before:border-x before:border-b before:border-dashed before:border-[#f6d9ad]/72 before:content-['']"
                >
                  <Plus className="relative z-10" size={13} strokeWidth={2.2} />
                </span>
              </span>
              <span className="leading-5">Add a new pocket to the apron.</span>
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-[#d6a25f]/50 bg-[#050403]/78 text-[#e7ad61]">
                <span className="relative grid h-7 w-7 place-items-center rounded-[0.24rem] bg-[#050403]/86 ring-1 ring-[#d6a25f]/70">
                  <Pencil size={14} aria-hidden="true" />
                </span>
              </span>
              <span className="leading-5">Edit the selected pocket details.</span>
            </div>
          </div>

          <div className="relative min-h-[28rem] overflow-hidden rounded-md border border-[#d6a25f]/20 bg-[radial-gradient(circle_at_50%_0%,rgba(214,162,95,0.13),transparent_34%),linear-gradient(180deg,#120c08,#050403)] p-3 sm:min-h-[36rem] sm:p-5">
            <div className="absolute right-3 top-3 z-20 grid gap-2 sm:right-5 sm:top-5">
              <button
                aria-label="Edit apron base"
                className="inline-flex size-11 items-center justify-center rounded-md border border-[#d6a25f]/60 bg-[#050403]/86 text-[#e7ad61] shadow-[0_14px_34px_rgba(0,0,0,0.3)] backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a25f]/12 hover:text-white"
                onClick={() => setActiveDesignerPanel("apron-base")}
                title="Edit apron base"
                type="button"
              >
                <Pencil size={18} aria-hidden="true" />
              </button>
              <button
                aria-label="Add a pocket"
                className="inline-flex size-11 items-center justify-center rounded-md border border-[#d6a25f]/60 bg-[#050403]/86 text-[#f6d9ad] shadow-[0_14px_34px_rgba(0,0,0,0.3)] backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a25f]/12 hover:text-white"
                onClick={() => setActiveDesignerPanel("add-pocket")}
                title="Add pocket"
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-[0.24rem] rounded-t-[0.16rem] bg-[#7b1716] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] before:pointer-events-none before:absolute before:inset-x-1 before:bottom-1 before:top-1 before:rounded-b-[0.16rem] before:border-x before:border-b before:border-dashed before:border-[#f6d9ad]/72 before:content-['']"
                >
                  <Plus className="relative z-10" size={15} strokeWidth={2.2} />
                </span>
              </button>
            </div>

            <svg
              aria-label={`${selectedApron.name} custom apron layout`}
              className="h-full max-h-[48rem] min-h-[26rem] w-full select-none"
              onPointerCancel={endPocketDrag}
              onPointerMove={movePocket}
              onPointerUp={endPocketDrag}
              ref={svgRef}
              role="img"
              style={{ touchAction: "pan-y" }}
              viewBox={viewBox}
            >
              <defs>
                <pattern
                  height="1"
                  id="designer-grid"
                  patternUnits="userSpaceOnUse"
                  width="1"
                >
                  <path
                    d="M 1 0 L 0 0 0 1"
                    fill="none"
                    stroke="#d6a25f"
                    strokeOpacity="0.08"
                    strokeWidth="0.03"
                  />
                </pattern>
                <filter
                  height="140%"
                  id="apron-leather-noise"
                  width="140%"
                  x="-20%"
                  y="-20%"
                >
                  <feTurbulence
                    baseFrequency="0.78"
                    numOctaves="3"
                    result="noise"
                    seed="7"
                    type="fractalNoise"
                  />
                  <feColorMatrix
                    in="noise"
                    result="grain"
                    type="saturate"
                    values="0"
                  />
                  <feBlend in="SourceGraphic" in2="grain" mode="multiply" />
                </filter>
              </defs>

              <rect
                fill="url(#designer-grid)"
                height={selectedApron.totalHeight + 3.8}
                width={selectedApron.totalWidth + 3.4}
                x={-1.5}
                y={-1.2}
              />

              <g>
                <path
                  d={getApronPath(selectedApron)}
                  fill={apronColor}
                  filter="url(#apron-leather-noise)"
                  stroke="#d6a25f"
                  strokeWidth="0.12"
                />
                <path
                  d={getApronPath(selectedApron)}
                  fill="none"
                  stroke="#f4d6ab"
                  strokeDasharray="0.18 0.12"
                  strokeOpacity="0.45"
                  strokeWidth="0.055"
                />
                <ApronHardwareMarkers apron={selectedApron} />
              </g>

              {pockets.map((pocket) => {
                const selected = pocket.id === activePocketId;
                const touchTargetPadding = 0.45;
                const editButtonSize = 1.25;
                const editIconSize = 0.66;
                const editIconOffset = (editButtonSize - editIconSize) / 2;
                const editButtonX = Math.max(
                  0.14,
                  pocket.width - editButtonSize - 0.16,
                );

                return (
                  <g
                    aria-label={`${pocket.name} pocket`}
                    className="cursor-grab active:cursor-grabbing"
                    key={pocket.id}
                    onLostPointerCapture={endPocketDrag}
                    onPointerDown={(event) => beginPocketDrag(event, pocket)}
                    role="button"
                    style={{ touchAction: "none" }}
                    tabIndex={0}
                    transform={`translate(${pocket.x} ${pocket.y})`}
                  >
                    <rect
                      fill="transparent"
                      height={pocket.height + touchTargetPadding * 2}
                      pointerEvents="all"
                      width={pocket.width + touchTargetPadding * 2}
                      x={-touchTargetPadding}
                      y={-touchTargetPadding}
                    />
                    <rect
                      fill={pocket.color}
                      height={pocket.height}
                      rx="0.18"
                      stroke={selected ? "#f0bc72" : "#23150f"}
                      strokeWidth={selected ? 0.16 : 0.08}
                      width={pocket.width}
                    />
                    <path
                      d={getPocketStitchPath(pocket.width, pocket.height)}
                      fill="none"
                      stroke="#f6d9ad"
                      strokeDasharray="0.18 0.11"
                      strokeOpacity="0.62"
                      strokeWidth="0.055"
                    />
                    {pocket.verticalStitch ? (
                      <line
                        stroke="#f6d9ad"
                        strokeDasharray="0.18 0.11"
                        strokeOpacity="0.8"
                        strokeWidth="0.065"
                        x1={pocket.width / 2}
                        x2={pocket.width / 2}
                        y1={getPocketVerticalStitchStart(pocket.height)}
                        y2={Math.max(
                          getPocketVerticalStitchStart(pocket.height) + 0.1,
                          pocket.height - 0.22,
                        )}
                      />
                    ) : null}
                    <g
                      aria-label={`Edit ${pocket.name}`}
                      className="cursor-pointer outline-none focus:outline-none"
                      onClick={(event) => {
                        event.stopPropagation();
                        openPocketDetail(pocket.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") {
                          return;
                        }

                        event.preventDefault();
                        openPocketDetail(pocket.id);
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                      role="button"
                      style={{
                        outline: "none",
                        WebkitTapHighlightColor: "transparent",
                      }}
                      tabIndex={0}
                      transform={`translate(${editButtonX} 0.16)`}
                    >
                      <title>{`Edit ${pocket.name}`}</title>
                      <rect
                        fill="#050403"
                        fillOpacity="0.86"
                        height={editButtonSize}
                        rx="0.14"
                        stroke="#d6a25f"
                        strokeOpacity="0.72"
                        strokeWidth="0.055"
                        width={editButtonSize}
                      />
                      <Pencil
                        aria-hidden="true"
                        color="#e7ad61"
                        height={editIconSize}
                        strokeWidth={2}
                        width={editIconSize}
                        x={editIconOffset}
                        y={editIconOffset}
                      />
                    </g>
                  </g>
                );
              })}

              <g aria-hidden="true" pointerEvents="none">
                <line
                  stroke="#d6a25f"
                  strokeOpacity="0.58"
                  strokeWidth="0.045"
                  x1="0"
                  x2={selectedApron.totalWidth}
                  y1={selectedApron.totalHeight + 0.55}
                  y2={selectedApron.totalHeight + 0.55}
                />
                <line
                  stroke="#d6a25f"
                  strokeOpacity="0.58"
                  strokeWidth="0.045"
                  x1={selectedApron.totalWidth + 0.52}
                  x2={selectedApron.totalWidth + 0.52}
                  y1="0"
                  y2={selectedApron.totalHeight}
                />
                <text
                  fill="#f4d6ab"
                  fontSize="0.52"
                  textAnchor="middle"
                  x={selectedApron.totalWidth / 2}
                  y={selectedApron.totalHeight + 1.15}
                >
                  {formatInches(selectedApron.totalWidth)} in
                </text>
                <text
                  fill="#f4d6ab"
                  fontSize="0.52"
                  textAnchor="middle"
                  transform={`rotate(90 ${selectedApron.totalWidth + 1.02} ${
                    selectedApron.totalHeight / 2
                  })`}
                  x={selectedApron.totalWidth + 1.02}
                  y={selectedApron.totalHeight / 2}
                >
                  {formatInches(selectedApron.totalHeight)} in
                </text>
                {selectedApron.bibWidth ? (
                  <text
                    fill="#f4d6ab"
                    fontSize="0.48"
                    textAnchor="middle"
                    x={selectedApron.totalWidth / 2}
                    y="-0.35"
                  >
                    {formatInches(selectedApron.bibWidth)} in bib
                  </text>
                ) : null}
              </g>
            </svg>

            <AnimatePresence initial={false}>
              {activeDesignerPanel ? (
                <motion.div
                  aria-label={
                    activeDesignerPanel === "apron-base"
                      ? "Apron base controls"
                      : activeDesignerPanel === "add-pocket"
                        ? "Add pocket controls"
                        : "Pocket detail controls"
                  }
                  className="absolute inset-3 z-30 overflow-y-auto rounded-md border border-[#d6a25f]/35 bg-[#090604]/96 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.48)] backdrop-blur-md sm:inset-5 sm:p-5"
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
                  role="dialog"
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <div className="-mx-4 -mt-4 mb-8 flex items-center justify-between gap-4 border-b border-white/10 bg-[#090604]/96 px-4 py-4 sm:-mx-5 sm:-mt-5 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3 text-[#e7ad61]">
                      {activeDesignerPanel === "apron-base" ? (
                        <Scissors size={20} strokeWidth={1.55} aria-hidden="true" />
                      ) : activeDesignerPanel === "add-pocket" ? (
                        <BadgePlus size={20} strokeWidth={1.55} aria-hidden="true" />
                      ) : (
                        <Move size={20} strokeWidth={1.55} aria-hidden="true" />
                      )}
                      <h2 className="font-display truncate text-2xl font-semibold text-white">
                        {activeDesignerPanel === "apron-base"
                          ? "Apron Base"
                          : activeDesignerPanel === "add-pocket"
                            ? "Add Pocket"
                            : "Pocket Detail"}
                      </h2>
                    </div>
                    <button
                      aria-label="Close panel"
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-white/14 text-[#e7ad61] transition duration-200 hover:border-[#d6a25f]/70 hover:bg-[#d6a25f]/10 hover:text-white"
                      onClick={() => setActiveDesignerPanel(null)}
                      title="Close"
                      type="button"
                    >
                      <X size={19} aria-hidden="true" />
                    </button>
                  </div>

                  {activeDesignerPanel === "apron-base" ? (
                    <div className="grid gap-5">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {APRON_TEMPLATES.map((template) => {
                          const selected = template.id === selectedApron.id;

                          return (
                            <button
                              className={`min-h-28 rounded-md border px-4 py-4 text-left transition duration-200 ${
                                selected
                                  ? "border-[#d6a25f] bg-[#d6a25f]/12"
                                  : "border-white/12 bg-black/20 hover:border-[#d6a25f]/60"
                              }`}
                              key={template.id}
                              onClick={() => selectApron(template)}
                              type="button"
                            >
                              <span className="block text-sm font-semibold uppercase tracking-[0.18em] text-[#e7ad61]">
                                {template.shortName}
                              </span>
                              <span className="mt-2 block text-sm leading-6 text-[#cdbdaa]">
                                {template.description}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div>
                        <div className="flex items-center gap-3 text-[#e7ad61]">
                          <Paintbrush
                            size={20}
                            strokeWidth={1.55}
                            aria-hidden="true"
                          />
                          <h3 className="text-sm font-semibold uppercase tracking-[0.18em]">
                            Body Color
                          </h3>
                        </div>
                        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-12">
                          {LEATHER_COLORS.map((color) => (
                            <button
                              aria-label={`Use ${color.name} leather for apron body`}
                              className={`size-8 rounded-full border transition duration-200 ${
                                color.value === apronColor
                                  ? "border-[#f0bc72] ring-2 ring-[#f0bc72]/35"
                                  : "border-white/20 hover:border-[#f0bc72]/70"
                              }`}
                              key={color.value}
                              onClick={() => setApronColor(color.value)}
                              style={{ backgroundColor: color.value }}
                              title={color.name}
                              type="button"
                            />
                          ))}
                        </div>
                      </div>

                      <ApronPanelPreview
                        apron={selectedApron}
                        apronColor={apronColor}
                        title="Apron Base Preview"
                      />
                    </div>
                  ) : null}

                  {activeDesignerPanel === "add-pocket" ? (
                    <div className="grid gap-3 md:grid-cols-3">
                      {POCKET_TEMPLATES.map((template) => (
                        <button
                          className="grid min-h-24 grid-cols-[4.5rem_1fr] items-center gap-4 rounded-md border border-white/12 bg-black/20 px-3 py-3 text-left text-sm text-[#f7f1e8] transition duration-200 hover:border-[#d6a25f]/70 hover:bg-[#d6a25f]/10 sm:px-4"
                          key={template.id}
                          onClick={() => addPocket(template)}
                          type="button"
                        >
                          <PocketTemplatePreview template={template} />
                          <span className="min-w-0">
                            <span className="block font-semibold">
                              {template.name}
                            </span>
                            <span className="mt-1 block text-xs uppercase tracking-[0.16em] text-[#cdbdaa]">
                              {formatInches(template.width)} x{" "}
                              {formatInches(template.height)}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {activeDesignerPanel === "pocket-detail" ? (
                    activePocket ? (
                      <div className="grid gap-5">
                        <div className="grid gap-4 lg:grid-cols-[minmax(14rem,0.8fr)_minmax(18rem,1.2fr)]">
                          <div className="grid content-start gap-4">
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                              <label className={pocketFieldLabelClass}>
                                Width
                                <input
                                  className={pocketFieldInputClass}
                                  onChange={(event) =>
                                    updateActivePocket({
                                      width: toNumber(
                                        event.target.value,
                                        activePocket.width,
                                      ),
                                    })
                                  }
                                  step="0.25"
                                  type="number"
                                  value={formatInches(activePocket.width)}
                                />
                              </label>
                              <label className={pocketFieldLabelClass}>
                                Height
                                <input
                                  className={pocketFieldInputClass}
                                  onChange={(event) =>
                                    updateActivePocket({
                                      height: toNumber(
                                        event.target.value,
                                        activePocket.height,
                                      ),
                                    })
                                  }
                                  step="0.25"
                                  type="number"
                                  value={formatInches(activePocket.height)}
                                />
                              </label>
                            </div>

                            <label className="flex min-h-11 items-center justify-between gap-4 rounded-md border border-white/12 bg-black/20 px-3 text-sm text-[#f7f1e8] sm:px-4">
                              <span>Vertical center stitch</span>
                              <input
                                checked={activePocket.verticalStitch}
                                className="h-4 w-4 accent-[#d6a25f]"
                                onChange={(event) =>
                                  updateActivePocket({
                                    verticalStitch: event.target.checked,
                                  })
                                }
                                type="checkbox"
                              />
                            </label>
                          </div>

                          <div className="grid gap-4 md:grid-cols-[minmax(13rem,1fr)_minmax(12rem,0.95fr)]">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e7ad61]">
                                Pocket Color
                              </p>
                              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-6">
                                {LEATHER_COLORS.map((color) => (
                                  <button
                                    aria-label={`Use ${color.name} leather for selected pocket`}
                                    className={`size-7 rounded-full border transition duration-200 sm:size-8 xl:size-7 ${
                                      color.value === activePocket.color
                                        ? "border-[#f0bc72] ring-2 ring-[#f0bc72]/35"
                                        : "border-white/20 hover:border-[#f0bc72]/70"
                                    }`}
                                    key={color.value}
                                    onClick={() =>
                                      updateActivePocket({ color: color.value })
                                    }
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                    type="button"
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="grid content-start gap-3">
                              <label className={pocketFieldLabelClass}>
                                Layer
                                <select
                                  className={pocketFieldInputClass}
                                  onChange={(event) =>
                                    moveActivePocketToLayer(Number(event.target.value))
                                  }
                                  value={activeLayerIndex}
                                >
                                  {pockets.map((pocket, index) => (
                                    <option key={pocket.id} value={index}>
                                      {getLayerLabel(index, pockets.length)}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <button
                                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/14 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#f7f1e8] transition duration-200 hover:border-[#d6a25f]/70 hover:bg-[#d6a25f]/10 disabled:cursor-not-allowed disabled:opacity-45"
                                  disabled={activeLayerIndex <= 0}
                                  onClick={() => moveActivePocketToLayer(0)}
                                  title="Send selected pocket behind the others"
                                  type="button"
                                >
                                  <SendToBack size={15} aria-hidden="true" />
                                  Back
                                </button>
                                <button
                                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/14 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#f7f1e8] transition duration-200 hover:border-[#d6a25f]/70 hover:bg-[#d6a25f]/10 disabled:cursor-not-allowed disabled:opacity-45"
                                  disabled={
                                    activeLayerIndex === -1 ||
                                    activeLayerIndex >= pockets.length - 1
                                  }
                                  onClick={() =>
                                    moveActivePocketToLayer(pockets.length - 1)
                                  }
                                  title="Bring selected pocket in front of the others"
                                  type="button"
                                >
                                  <BringToFront size={15} aria-hidden="true" />
                                  Front
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <button
                                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/14 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#f7f1e8] transition duration-200 hover:border-[#d6a25f]/70 hover:bg-[#d6a25f]/10"
                                  onClick={duplicateActivePocket}
                                  type="button"
                                >
                                  <Copy size={15} aria-hidden="true" />
                                  Copy
                                </button>
                                <button
                                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#b95438]/70 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#f4b6a6] transition duration-200 hover:bg-[#b95438]/12"
                                  onClick={removeActivePocket}
                                  type="button"
                                >
                                  <Trash2 size={15} aria-hidden="true" />
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <ApronPanelPreview
                          apron={selectedApron}
                          apronColor={apronColor}
                          pockets={pockets}
                          selectedPocketId={activePocket.id}
                          title="Pocket Preview"
                        />
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        <p className="text-sm leading-6 text-[#cdbdaa]">
                          Add a pocket to begin.
                        </p>
                        <button
                          className="inline-flex min-h-12 w-fit items-center justify-center gap-3 rounded-md border border-[#d6a25f]/55 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#e7ad61] transition duration-200 hover:bg-[#d6a25f]/10 hover:text-white"
                          onClick={() => setActiveDesignerPanel("add-pocket")}
                          type="button"
                        >
                          <BadgePlus size={16} aria-hidden="true" />
                          Add Pocket
                        </button>
                      </div>
                    )
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

        </div>
        ) : (
          <div className="rounded-lg border border-white/12 bg-[#090604]/88 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur-md sm:p-6">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e7ad61]">
                  Upload Design Image
                </p>
                <h3 className="font-display mt-3 text-3xl font-semibold text-white">
                  Send Crispin your own apron idea.
                </h3>
                <p className="mt-4 max-w-2xl text-base leading-7 text-[#d8cabc]">
                  Upload a drawing, photo, screenshot, or marked-up reference
                  image instead of building a mockup on the board.
                </p>
                <label className="mt-6 inline-flex min-h-14 cursor-pointer items-center justify-center gap-3 rounded-md bg-[linear-gradient(135deg,#efbd75,#c7802e)] px-7 text-sm font-semibold uppercase tracking-[0.18em] !text-[#050403] shadow-[0_0_30px_rgba(214,162,95,0.26)] transition duration-200 hover:-translate-y-0.5">
                  <Upload size={18} aria-hidden="true" />
                  Choose Image
                  <input
                    accept={ACCEPTED_UPLOAD_IMAGE_TYPES.join(",")}
                    className="sr-only"
                    onChange={handleUploadedDesignImageChange}
                    ref={uploadInputRef}
                    type="file"
                  />
                </label>
                <p className="mt-3 text-sm leading-6 text-[#cdbdaa]">
                  PNG, JPG, or WebP. Keep the file small enough to email.
                </p>
                {uploadError ? (
                  <p className="mt-3 text-sm font-semibold text-[#f0a6a6]">
                    {uploadError}
                  </p>
                ) : null}
              </div>

              <div className="min-h-[24rem] rounded-md border border-[#d6a25f]/20 bg-[radial-gradient(circle_at_50%_0%,rgba(214,162,95,0.13),transparent_34%),linear-gradient(180deg,#120c08,#050403)] p-3 sm:p-5">
                {uploadedDesignImage ? (
                  <div
                    aria-label={`Preview of ${uploadedDesignImage.name}`}
                    className="h-[24rem] rounded-md border border-white/12 bg-contain bg-center bg-no-repeat"
                    role="img"
                    style={{
                      backgroundImage: `url("${uploadedDesignImage.dataUrl}")`,
                    }}
                  />
                ) : (
                  <div className="grid h-[24rem] place-items-center rounded-md border border-dashed border-[#d6a25f]/36 bg-black/20 p-6 text-center">
                    <div>
                      <Upload
                        className="mx-auto text-[#e7ad61]"
                        size={34}
                        strokeWidth={1.45}
                        aria-hidden="true"
                      />
                      <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#e7ad61]">
                        No image selected
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#cdbdaa]">
                        The selected image will appear here before you send the
                        form.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>

      <motion.form
        className="rounded-lg border border-white/12 bg-[#0c0805]/82 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur-md"
        onSubmit={handleSubmit}
        variants={fadeUp}
      >
        <div className="grid gap-6 lg:grid-cols-[0.72fr_1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e7ad61]">
              Send Design
            </p>
            <h2 className="font-display mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              {submissionMode === "upload"
                ? "Request a custom build from your image."
                : "Request a custom build from this layout."}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#d8cabc]">
              {submissionMode === "upload"
                ? "The email includes your contact details and the image you upload."
                : "The email includes your contact details, apron base, pocket detail, and an image of the design."}
            </p>

            <div className="mt-6 max-w-sm rounded-md border border-[#d6a25f]/20 bg-[linear-gradient(180deg,#120c08,#050403)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              {submissionMode === "upload" ? (
                uploadedDesignImage ? (
                  <div
                    aria-label={`Preview of ${uploadedDesignImage.name}`}
                    className="mx-auto h-56 max-w-[14rem] rounded-md bg-contain bg-center bg-no-repeat"
                    role="img"
                    style={{
                      backgroundImage: `url("${uploadedDesignImage.dataUrl}")`,
                    }}
                  />
                ) : (
                  <div className="mx-auto grid h-56 max-w-[14rem] place-items-center rounded-md border border-dashed border-[#d6a25f]/36 bg-black/20 px-5 text-center">
                    <div>
                      <Upload
                        className="mx-auto text-[#e7ad61]"
                        size={28}
                        strokeWidth={1.45}
                        aria-hidden="true"
                      />
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#cdbdaa]">
                        Upload Preview
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div
                  className="mx-auto h-56 max-w-[14rem] [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: svgMarkup }}
                />
              )}
            </div>
          </div>

          <div className="grid min-w-0 gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={contactFieldLabelClass}>
                Name
                <input
                  className={contactFieldControlClass}
                  onChange={(event) => updateField("name", event.target.value)}
                  required
                  type="text"
                  value={form.name}
                />
              </label>
              <label className={contactFieldLabelClass}>
                Email
                <input
                  className={contactFieldControlClass}
                  onChange={(event) => updateField("email", event.target.value)}
                  type="email"
                  value={form.email}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className={contactFieldLabelClass}>
                Phone
                <input
                  className={contactFieldControlClass}
                  onChange={(event) => updateField("phone", event.target.value)}
                  type="tel"
                  value={form.phone}
                />
              </label>
              <label className={contactFieldLabelClass}>
                Preferred
                <span className="relative block">
                  <select
                    className={`${contactSelectControlClass} disabled:cursor-not-allowed disabled:opacity-70`}
                    disabled={isPreferredContactLocked}
                    onChange={(event) =>
                      updateField(
                        "preferredContact",
                        event.target.value as PreferredContact,
                      )
                    }
                    value={preferredContactValue}
                  >
                    {preferredContactOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[#e7ad61]"
                    size={18}
                  />
                </span>
              </label>
            </div>

            <label className={contactFieldLabelClass}>
              Intended Use
              <textarea
                className={contactTextareaClass}
                onChange={(event) => updateField("useCase", event.target.value)}
                value={form.useCase}
              />
            </label>

            <label className={contactFieldLabelClass}>
              Notes
              <textarea
                className={contactTextareaClass}
                onChange={(event) => updateField("notes", event.target.value)}
                value={form.notes}
              />
            </label>

            <button
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-md bg-[linear-gradient(135deg,#efbd75,#c7802e)] px-7 text-sm font-semibold uppercase tracking-[0.18em] !text-[#050403] shadow-[0_0_30px_rgba(214,162,95,0.26)] transition duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
              disabled={status === "submitting"}
              type="submit"
            >
              <Mail size={19} aria-hidden="true" />
              {status === "submitting" ? "Sending" : "Email Custom Design"}
            </button>

            {message ? (
              <div aria-live="polite" className="grid gap-2">
                <p
                  className={`text-sm font-semibold ${
                    status === "success" ? "text-[#e7ad61]" : "text-[#f0a6a6]"
                  }`}
                >
                  {message}
                </p>
                {fallbackEmailHref ? (
                  <a
                    className="inline-flex w-fit items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#e7ad61] underline decoration-[#e7ad61]/60 underline-offset-4 transition hover:text-white"
                    href={fallbackEmailHref}
                  >
                    <Mail size={16} aria-hidden="true" />
                    Open Email Draft
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </motion.form>
    </motion.section>
  );
}

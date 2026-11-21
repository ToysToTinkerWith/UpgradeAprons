import type { ApronProduct } from "@/lib/site-data";

export function normalizeStandardSize(value: unknown): ApronProduct["standardSize"] {
  return value === "small" || value === "large" ? value : null;
}

export function normalizeMeasurements(value: unknown): ApronProduct["measurements"] {
  if (!value || typeof value !== "object") return null;
  const { bodyWidthInches, bodyLengthInches } = value as Record<string, unknown>;
  if (typeof bodyWidthInches !== "number" || typeof bodyLengthInches !== "number") return null;
  if (![bodyWidthInches, bodyLengthInches].every(number => Number.isFinite(number) && number > 0 && number <= 100)) return null;
  return { bodyWidthInches, bodyLengthInches };
}

export function getStandardSizeLabel(product: ApronProduct) {
  const size = product.standardSize === "small" ? "Small" : product.standardSize === "large" ? "Large" : null;
  return size ?? "Size to be confirmed";
}

export function formatMeasurement(inches: number) {
  return `${inches} in / ${Number((inches * 2.54).toFixed(1))} cm`;
}

import type { ApronProduct } from "@/lib/site-data";

const textFields = ["title", "category", "eyebrow", "intro", "description", "material", "finish", "priceNote"] as const;
type TextField = typeof textFields[number];

export function getProductSpecDisplayValue(spec: ApronProduct["specs"][number]) {
  if (!/^pockets?$/i.test(spec.label.trim())) return spec.value;
  const count = spec.value.match(/^\s*(\d+)\s*(?:compartments?|pockets?)?\s*$/i);
  return count ? count[1] : spec.value;
}

export type ProductTextBinding = {
  slug: string;
  field: TextField | "details" | "layoutTags" | "specs";
  index?: number;
  part?: "label" | "value";
};

export function parseProductTextBinding(slug: string, field: string, index?: string, part?: string): ProductTextBinding | null {
  if (textFields.includes(field as TextField)) return { slug, field: field as TextField };
  if (!["details", "layoutTags", "specs"].includes(field) || !index || !/^\d+$/.test(index)) return null;
  if (field === "specs" && part !== "label" && part !== "value") return null;
  return { slug, field: field as ProductTextBinding["field"], index: Number(index), part: part as ProductTextBinding["part"] };
}

export function productTextPatch(product: ApronProduct, binding: ProductTextBinding, value: string) {
  const { field, index, part } = binding;
  if (field === "details" || field === "layoutTags") {
    const items = [...product[field]];
    if (index === undefined || index < 0 || index >= items.length) throw new Error("This text is no longer available. Reopen the editor.");
    items[index] = value;
    return { [field]: items };
  }
  if (field === "specs") {
    const specs = product.specs.map((spec) => ({ ...spec }));
    if (index === undefined || !specs[index] || !part) throw new Error("This specification is no longer available. Reopen the editor.");
    specs[index][part] = value;
    return { specs };
  }
  if (!textFields.includes(field)) throw new Error("Only product text can be edited.");
  return { [field]: value };
}

import type { SelectOption } from "@/components/ui/select";
import type { Product } from "@/lib/data/types";

export const categoryLabels: Record<Product["category"], string> = { cement: "Cement", steel: "Steel" };

/** The product's type within its brand: "Deccan OPC" → "OPC", "MS iron Vishaka" → "MS iron". */
export function variantOf(p: Product) {
  if (p.variant) return p.variant;
  return p.name.replace(new RegExp(`\\b${p.brand}\\b`, "i"), "").replace(/\s+/g, " ").trim() || p.name;
}

/** For plain dropdowns: each product under a "Cement · Deccan" style group that opens when tapped. */
export function productOptions(products: Product[]): SelectOption[] {
  return products.map((p) => ({ value: p.id, label: variantOf(p), group: `${categoryLabels[p.category]} · ${p.brand}` }));
}

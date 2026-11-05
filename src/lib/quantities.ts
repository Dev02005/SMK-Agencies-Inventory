import type { Product } from "@/lib/data/types";
import { formatNumber } from "@/lib/format";
import { toMT, unitLabel } from "@/lib/sales";

type Line = { productId: string; qty: number };

/** Totals by unit for a set of lines: bags of cement, kg of steel, and MT of each. */
export function sumQuantities(lines: Line[], products: Product[]) {
  const totals = { bags: 0, kg: 0, cementMT: 0, steelMT: 0 };
  for (const l of lines) {
    const p = products.find((x) => x.id === l.productId);
    if (!p) continue;
    if (p.unit === "bag") {
      totals.bags += l.qty;
      totals.cementMT += toMT(l.qty, "bag");
    } else if (p.unit === "kg") {
      totals.kg += l.qty;
      totals.steelMT += toMT(l.qty, "kg");
    }
  }
  return totals;
}

/** "450 bags · 2,000 kg" or custom item quantities */
export function describeQuantities(lines: Line[], products: Product[]): string {
  const map = new Map<string, number>();
  for (const l of lines) {
    const p = products.find((x) => x.id === l.productId);
    if (!p) continue;
    const u = unitLabel[p.unit] || (p.unit === "bag" ? "bags" : p.unit === "kg" ? "kg" : p.unit);
    map.set(u, (map.get(u) || 0) + l.qty);
  }
  return [...map.entries()].map(([u, q]) => `${formatNumber(q)} ${u}`).join(" · ");
}

/** "450 bags" or "2,000 kg" or custom unit for one line. */
export function lineQty(qty: number, product: Product | undefined): string {
  if (!product) return formatNumber(qty);
  const u = unitLabel[product.unit] || (product.unit === "bag" ? "bags" : product.unit === "kg" ? "kg" : product.unit);
  return `${formatNumber(qty)} ${u}`;
}

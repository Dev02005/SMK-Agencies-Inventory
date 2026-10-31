import type { Product } from "@/lib/data/types";
import { formatNumber } from "@/lib/format";
import { toMT } from "@/lib/sales";

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
    } else {
      totals.kg += l.qty;
      totals.steelMT += toMT(l.qty, "kg");
    }
  }
  return totals;
}

/** "450 bags · 2,000 kg" */
export function describeQuantities(lines: Line[], products: Product[]): string {
  const t = sumQuantities(lines, products);
  return [t.bags && `${formatNumber(t.bags)} bags`, t.kg && `${formatNumber(t.kg)} kg`].filter(Boolean).join(" · ");
}

/** "450 bags" or "2,000 kg" for one line. */
export function lineQty(qty: number, product: Product | undefined): string {
  if (!product) return formatNumber(qty);
  return `${formatNumber(qty)} ${product.unit === "bag" ? "bags" : "kg"}`;
}

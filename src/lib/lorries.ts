import type { ChipTone } from "@/components/ui/chip";
import type { Lorry } from "@/lib/data/types";

export type LorryState = "selling" | "sold";

/** Still selling, or sold out (its sale updated and marked sold out). */
export const lorryState = (l: Pick<Lorry, "sold">): LorryState => (l.sold ? "sold" : "selling");

export const lorryStateChip: Record<LorryState, { label: string; tone: ChipTone }> = {
  selling: { label: "Selling", tone: "warning" },
  sold: { label: "Sold out", tone: "good" },
};

/** The sale bill's total invoice value; a sale saved the older way (a rate per bag on each item) adds those up. */
export function saleInvoiceValue(sale: NonNullable<Lorry["sale"]>) {
  return sale.invoiceValue ?? sale.lines.reduce((s, x) => s + x.qty * ((x as { rate?: number }).rate ?? 0), 0);
}

/** What has been sold from the lorry so far: the sale bill's total invoice value, plus any charges received. */
export function lorrySaleValue(l: Pick<Lorry, "sale" | "unloadingCharges">) {
  if (!l.sale) return 0;
  return saleInvoiceValue(l.sale) + (l.unloadingCharges ? (l.sale.unloading ?? 0) : 0) + (l.sale.other ?? 0);
}

/**
 * What is still to be filled in on a lorry's sale: the two tick boxes (the company invoice's paper copy kept, unloading
 * charges paid to us) and the sale's total invoice value. Empty when nothing is missing.
 */
export function lorryMissing(l: Pick<Lorry, "invoicePaperKept" | "unloadingCharges" | "sale">): string[] {
  const missing: string[] = [];
  if (!l.invoicePaperKept) missing.push("Paper invoice copy");
  if (!l.unloadingCharges) missing.push("Unloading charges");
  if (!(l.sale && saleInvoiceValue(l.sale) > 0)) missing.push("Total invoice value");
  return missing;
}

/** Bags (or kg) of each item still on the lorry: what came on it less what is updated as sold. */
export function lorryLeft(l: Pick<Lorry, "lines" | "sale">) {
  return l.lines.map((line) => ({ productId: line.productId, qty: Math.max(0, line.qty - (l.sale?.lines.find((x) => x.productId === line.productId)?.qty ?? 0)) }));
}

/** Saved in the app (a real lorry, or a practice one marked sample), so it can be updated and deleted. */
export const isSavedLorry = (l: Pick<Lorry, "original" | "sample">) => Boolean(l.original || l.sample);

/** What the lorry cost us: its invoice value, once known. */
export const lorryCost = (l: Lorry) => l.invoiceValue || undefined;

/**
 * A lorry as an older version of the app kept it in one browser only (localStorage "ska-lorry-book"), before lorry
 * purchases were saved in the app's data. Read once to move them across.
 */
export type DeviceLorry = {
  id: string;
  firmId?: string;
  companyId: string;
  companyName: string;
  lorryNo: string;
  driverName: string;
  invoiceNo?: string;
  invoiceDate?: string;
  invoicePaperKept: boolean;
  unloadingCharges: boolean;
  arrivedOn: string;
  lines?: { productId: string; qty: number; rate?: number }[];
  freight?: number;
  closed?: { value: number; on: string; confirmed?: boolean };
};

export const DEVICE_LORRY_KEY = "ska-lorry-book";

/** A lorry's sale bills for the "Sold from this lorry" list: date, number, buyer, bags and amount, oldest first. */
export function soldBills(l: Pick<Lorry, "sale">) {
  return (l.sale?.bills ?? [])
    .map((b) => ({ date: b.date, billNo: b.billNo, soldTo: b.soldTo, qty: b.lines.reduce((s, x) => s + x.qty, 0), amount: b.amount }))
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
}

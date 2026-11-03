import type { ChipTone } from "@/components/ui/chip";
import type { Lorry } from "@/lib/data/types";
import { addDaysISO } from "@/lib/format";

/** The day a lorry's sale should be updated: its invoice (purchase) date plus the days it takes to sell out. */
export const updateDueOn = (l: Pick<Lorry, "invoiceDate" | "sellOutDays">) => addDaysISO(l.invoiceDate, l.sellOutDays);

export type LorryState = "selling" | "due" | "late" | "sold";

/** Still selling, its sale update due today, late (past that day and not updated), or sold out and updated. */
export function lorryState(l: Lorry, today: string): LorryState {
  if (l.sold) return "sold";
  const due = updateDueOn(l);
  return today > due ? "late" : today === due ? "due" : "selling";
}

export const lorryStateChip: Record<LorryState, { label: string; tone: ChipTone }> = {
  selling: { label: "Selling", tone: "warning" },
  due: { label: "Update due today", tone: "warning" },
  late: { label: "Update overdue", tone: "danger" },
  sold: { label: "Sold out", tone: "good" },
};

/** Whole days from one YYYY-MM-DD to a later one. */
export const daysFrom = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** What has been sold from the lorry so far: the items at their rates, plus any charges received. */
export function lorrySaleValue(l: Pick<Lorry, "sale" | "unloadingCharges">) {
  if (!l.sale) return 0;
  const items = l.sale.lines.reduce((s, x) => s + x.qty * x.rate, 0);
  return items + (l.unloadingCharges ? (l.sale.unloading ?? 0) : 0) + (l.sale.other ?? 0);
}

/** Bags (or kg) of each item still on the lorry: what came on it less what is updated as sold. */
export function lorryLeft(l: Pick<Lorry, "lines" | "sale">) {
  return l.lines.map((line) => ({ productId: line.productId, qty: Math.max(0, line.qty - (l.sale?.lines.find((x) => x.productId === line.productId)?.qty ?? 0)) }));
}

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
  sellOutDays?: number;
  arrivedOn: string;
  lines?: { productId: string; qty: number; rate?: number }[];
  freight?: number;
  closed?: { value: number; on: string; confirmed?: boolean };
};

export const DEVICE_LORRY_KEY = "ska-lorry-book";

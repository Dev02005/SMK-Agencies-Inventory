"use server";

import { addLorryPurchase, deleteLorry, getCurrentUser, getFirms, getLorries, getParties, getProducts, getToday, updateLorry } from "@/lib/data";
import type { Lorry } from "@/lib/data/types";
import { lorrySaleValue, type DeviceLorry } from "@/lib/lorries";

export type LorryInput = {
  firmId: string;
  companyId: string;
  lorryNo: string;
  driverName: string;
  invoiceNo: string;
  invoiceDate: string;
  invoicePaperKept: boolean;
  unloadingCharges: boolean;
  sellOutDays: number;
  lines: { productId: string; qty: number }[];
  invoiceValue: number;
};

export type LorryResult = { ok: true } | { ok: false; problem: string };

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
/** Rupees rounded to paise, or null when it isn't a sensible amount. */
const money = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100_000_000 ? Math.round(v * 100) / 100 : null);

const isOwner = async () => (await getCurrentUser()).role === "owner";

/** Checks a lorry purchase against the saved firms, companies and products; returns it ready to save, or the problem. */
async function checkLorry(input: LorryInput): Promise<Omit<Lorry, "id" | "original"> | string> {
  const [firms, parties, products] = await Promise.all([getFirms(), getParties(), getProducts()]);
  const firm = firms.find((f) => f.id === input?.firmId);
  if (!firm) return "Choose which firm this lorry is bought for.";
  const company = parties.find((p) => p.id === input.companyId && p.kind === "company");
  if (!company) return "Choose the company that sent the lorry.";
  const lorryNo = text(input.lorryNo, 20).toUpperCase();
  if (!lorryNo) return "Enter the lorry number.";
  const driverName = text(input.driverName, 60);
  if (!driverName) return "Enter the driver's name.";
  if (!isDate(input.invoiceDate)) return "Enter the invoice date.";
  const sellOutDays = Number(input.sellOutDays);
  if (!Number.isInteger(sellOutDays) || sellOutDays < 1 || sellOutDays > 60) return "Enter about how many days it takes to sell out (1 to 60).";

  // The same item on two rows is added together.
  const lines: Lorry["lines"] = [];
  for (const line of Array.isArray(input.lines) ? input.lines : []) {
    const qty = Number(line?.qty);
    if (!products.some((p) => p.id === line?.productId) || !Number.isFinite(qty) || qty <= 0 || qty > 1_000_000) return "Check the items on the lorry.";
    const same = lines.find((l) => l.productId === line.productId);
    if (same) same.qty += qty;
    else lines.push({ productId: line.productId, qty });
  }
  if (lines.length === 0) return "Enter what's on the lorry.";

  const invoiceValue = money(input.invoiceValue);
  if (invoiceValue === null) return "Enter the total invoice value in rupees.";

  return {
    firmId: firm.id,
    companyId: company.id,
    companyName: company.name,
    lorryNo,
    driverName,
    invoiceNo: text(input.invoiceNo, 40) || undefined,
    invoiceDate: input.invoiceDate,
    invoicePaperKept: Boolean(input.invoicePaperKept),
    unloadingCharges: Boolean(input.unloadingCharges),
    sellOutDays,
    lines,
    invoiceValue: invoiceValue || undefined,
  };
}

/** Deletes a lorry purchase you entered (with its sale); the sample lorry stays. */
export async function removeLorry(id: string): Promise<LorryResult> {
  if (!(await isOwner())) return { ok: false, problem: "Only the owner can delete lorry purchases." };
  return (await deleteLorry(String(id))) ? { ok: true } : { ok: false, problem: "Only lorries you entered can be deleted." };
}

/** A new lorry purchase. Only the owner deals in lorries. */
export async function saveLorryPurchase(input: LorryInput): Promise<LorryResult> {
  if (!(await isOwner())) return { ok: false, problem: "Only the owner can enter lorry purchases." };
  const lorry = await checkLorry(input);
  if (typeof lorry === "string") return { ok: false, problem: lorry };
  await addLorryPurchase(lorry);
  return { ok: true };
}

export type LorrySaleInput = {
  lines: { productId: string; qty: number; rate: number }[];
  invoicePaperKept: boolean;
  unloadingCharges: boolean;
  /** Unloading charges received, when they are paid to us. */
  unloading: number;
  other: number;
  notes: string;
  soldOut: boolean;
  soldOn: string;
};

/**
 * Sales › Lorry sales › Update: what has been sold from the lorry so far (each item's quantity and rate), the tick
 * boxes, charges received, and whether it is sold out (which ends the reminder). It can be updated again later.
 */
export async function updateLorrySale(id: string, input: LorrySaleInput): Promise<LorryResult> {
  if (!(await isOwner())) return { ok: false, problem: "Only the owner can update lorry sales." };
  const lorry = (await getLorries()).find((l) => l.id === id);
  if (!lorry) return { ok: false, problem: "That lorry is no longer there. Reload the page." };
  if (!lorry.original) return { ok: false, problem: "This is a sample lorry; only lorries you enter can be updated." };

  const lines: NonNullable<Lorry["sale"]>["lines"] = [];
  for (const line of Array.isArray(input?.lines) ? input.lines : []) {
    const loaded = lorry.lines.find((l) => l.productId === line?.productId);
    const qty = Number(line?.qty);
    const rate = money(line?.rate);
    if (!loaded || lines.some((l) => l.productId === loaded.productId)) return { ok: false, problem: "Check the items sold." };
    if (!Number.isFinite(qty) || qty < 0 || qty > loaded.qty) return { ok: false, problem: `Sold can't be more than came on the lorry (${loaded.qty}).` };
    if (rate === null) return { ok: false, problem: "Enter the rate in rupees." };
    if (qty > 0 && rate === 0) return { ok: false, problem: "Enter the rate for each item sold." };
    lines.push({ productId: loaded.productId, qty, rate });
  }
  const unloading = input.unloadingCharges ? money(input.unloading) : 0;
  const other = money(input.other);
  if (unloading === null || other === null) return { ok: false, problem: "Enter the charges in rupees." };
  const notes = text(input.notes, 200) || undefined;
  const today = await getToday();
  const sale = { lines, unloading: unloading || undefined, other: other || undefined, notes, updatedOn: today };
  const value = lorrySaleValue({ sale, unloadingCharges: Boolean(input.unloadingCharges) });

  let sold: Lorry["sold"];
  if (input.soldOut) {
    if (!isDate(input.soldOn) || input.soldOn < lorry.invoiceDate) return { ok: false, problem: "Enter the day it sold out (not before the invoice date)." };
    if (!(value > 0)) return { ok: false, problem: "Enter what was sold before marking it sold out." };
    sold = { on: input.soldOn, value, notes };
  }
  await updateLorry(id, { sale, sold, invoicePaperKept: Boolean(input.invoicePaperKept), unloadingCharges: Boolean(input.unloadingCharges) });
  return { ok: true };
}

/**
 * Lorries an older version of the app kept in one browser only: each is checked like a new purchase and saved,
 * with its sale if it was closed. Ones already saved (same lorry number and date) are skipped.
 */
export async function importDeviceLorries(list: DeviceLorry[]): Promise<{ ok: true; saved: number; skipped: number } | { ok: false; problem: string }> {
  if (!(await isOwner())) return { ok: false, problem: "Only the owner can move lorry purchases." };
  if (!Array.isArray(list) || list.length > 500) return { ok: false, problem: "Nothing to move." };
  const [firms, existing] = await Promise.all([getFirms(), getLorries()]);
  const primary = firms.find((f) => f.primary) ?? firms[0];
  let saved = 0;
  let skipped = 0;
  for (const old of list) {
    if (!old || typeof old !== "object") {
      skipped++;
      continue;
    }
    const lines = Array.isArray(old.lines) ? old.lines : [];
    const invoiceDate = old.invoiceDate ?? old.arrivedOn;
    const lorryNo = text(old.lorryNo, 20).toUpperCase();
    if (existing.some((l) => l.lorryNo === lorryNo && l.invoiceDate === invoiceDate)) {
      skipped++;
      continue;
    }
    const lorry = await checkLorry({
      firmId: old.firmId ?? primary.id,
      companyId: old.companyId,
      lorryNo,
      driverName: old.driverName,
      invoiceNo: old.invoiceNo ?? "",
      invoiceDate: invoiceDate ?? "",
      invoicePaperKept: old.invoicePaperKept,
      unloadingCharges: old.unloadingCharges,
      // Older lorries may not say; the reminder then comes a day after the invoice date.
      sellOutDays: old.sellOutDays && old.sellOutDays > 0 ? old.sellOutDays : 1,
      lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
      invoiceValue: lines.length > 0 && lines.every((l) => l.rate) ? lines.reduce((s, l) => s + (l.rate ?? 0) * l.qty, 0) : 0,
    });
    if (typeof lorry === "string") {
      skipped++;
      continue;
    }
    const added = await addLorryPurchase(lorry);
    const value = money(old.closed?.value);
    if (value && old.closed && isDate(old.closed.on)) {
      await updateLorry(added.id, { sold: { on: old.closed.on, value }, invoicePaperKept: added.invoicePaperKept, unloadingCharges: added.unloadingCharges });
    }
    saved++;
  }
  return { ok: true, saved, skipped };
}

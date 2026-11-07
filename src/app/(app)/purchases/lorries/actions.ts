"use server";

import { addLorryPurchase, deleteLorry, getCurrentUser, getFirms, getLorries, getParties, getProducts, getToday, updateLorry, updateLorryBills } from "@/lib/data";
import type { Lorry } from "@/lib/data/types";
import { mobileOf } from "@/lib/mobile";
import { isSavedLorry, lorrySaleValue, type DeviceLorry } from "@/lib/lorries";

export type LorryInput = {
  firmId: string;
  companyId: string;
  lorryNo: string;
  /** Company's purchase invoice number. */
  invoiceNo?: string;
  /** The truck driver's mobile number. */
  driverMobile: string;
  invoiceDate: string;
  /** The day the truck arrived. */
  receivedOn?: string;
  lines: { productId: string; qty: number }[];
  invoiceValue: number;
};

export type LorryResult = { ok: true; billNumbers?: string[] } | { ok: false; problem: string };

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
/** Rupees rounded to paise, or null when it isn't a sensible amount. */
const money = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100_000_000 ? Math.round(v * 100) / 100 : null);

const isOwner = async () => (await getCurrentUser()).role === "owner";

/**
 * Checks a lorry purchase against the saved firms, companies and products; returns it ready to save, or the problem.
 * `requireDriver` is off only for lorries an older version kept, which may have no driver's number.
 */
async function checkLorry(input: LorryInput, requireDriver = true): Promise<Omit<Lorry, "id" | "original"> | string> {
  const [firms, parties, products] = await Promise.all([getFirms(), getParties(), getProducts()]);
  const firm = firms.find((f) => f.id === input?.firmId);
  if (!firm) return "Choose which firm this lorry is bought for.";
  const company = parties.find((p) => p.id === input.companyId && p.kind === "company");
  if (!company) return "Choose the company that sent the lorry.";
  const lorryNo = text(input.lorryNo, 20).toUpperCase();
  if (!lorryNo) return "Enter the truck number.";
  const invoiceNo = text(input.invoiceNo, 40);
  const driverMobile = mobileOf(text(input.driverMobile, 20));
  if (driverMobile.length !== 10 && (requireDriver || driverMobile)) return "Enter the driver's 10-digit mobile number.";
  if (!isDate(input.invoiceDate)) return "Enter the invoice date.";
  if (input.receivedOn !== undefined && !isDate(input.receivedOn)) return "Enter the day the truck was received.";
  if (input.receivedOn && input.receivedOn < input.invoiceDate) return "The truck can't arrive before the invoice date.";

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
    driverMobile: driverMobile || undefined,
    invoiceNo: invoiceNo || undefined,
    invoiceDate: input.invoiceDate,
    receivedOn: input.receivedOn || undefined,
    // Ticked when the sale is updated (Sales › Lorry sales).
    invoicePaperKept: false,
    unloadingCharges: false,
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
  /** Each sale bill from the lorry: its number, who bought, how much of each item and the bill's amount. */
  /** `billNo`: a bill already saved keeps its number; a new bill sends "" and is numbered next in the series on save. */
  bills: {
    date: string;
    billNo: string;
    partyId?: string;
    soldTo: string;
    cashName?: string;
    cashMobile?: string;
    place?: string;
    lines: { productId: string; qty: number }[];
    amount: number;
  }[];
  /** The sale's total invoice value: the bills added up, or what the owner typed in. */
  invoiceValue: number;
  invoicePaperKept: boolean;
  unloadingCharges: boolean;
  /** Unloading charges received, when they are paid to us. */
  unloading: number;
  /** Other charges received, each with its name. */
  others: { name: string; amount: number }[];
  notes: string;
  soldOut: boolean;
  soldOn: string;
};

/**
 * Sales › Lorry sales › Update: what has been sold from the lorry so far, bill by bill (each bill's number, who bought,
 * the bags of each item and its amount), the tick boxes, charges received, and whether it is sold out (which ends the
 * reminder). It can be updated again later.
 */
export async function updateLorrySale(id: string, input: LorrySaleInput): Promise<LorryResult> {
  if (!(await isOwner())) return { ok: false, problem: "Only the owner can update lorry sales." };
  const lorry = (await getLorries()).find((l) => l.id === id);
  if (!lorry) return { ok: false, problem: "That lorry is no longer there. Reload the page." };
  if (!isSavedLorry(lorry)) return { ok: false, problem: "This is a sample lorry; only lorries you enter can be updated." };

  // Each bill; empty rows are dropped, and the same item twice on a bill is added together.
  const bills: NonNullable<NonNullable<Lorry["sale"]>["bills"]> = [];
  const list = Array.isArray(input?.bills) ? input.bills : [];
  if (list.length > 200) return { ok: false, problem: "Too many bills." };
  for (const bill of list) {
    const billLines: { productId: string; qty: number }[] = [];
    for (const line of Array.isArray(bill?.lines) ? bill.lines : []) {
      const qty = Number(line?.qty);
      if (!lorry.lines.some((l) => l.productId === line?.productId) || !Number.isFinite(qty) || qty < 0 || qty > 1_000_000) return { ok: false, problem: "Check the items on the bills." };
      if (qty === 0) continue;
      const same = billLines.find((l) => l.productId === line.productId);
      if (same) same.qty += qty;
      else billLines.push({ productId: line.productId, qty });
    }
    // Only a number this lorry's bills already have is kept; anything else is a new bill, numbered on save.
    const asked = text(bill?.billNo, 20);
    const billNo = lorry.sale?.bills?.some((b) => b.billNo === asked) || (asked && asked === lorry.sale?.invoiceNo && !lorry.sale?.bills?.length) ? asked : "";
    const name = billNo ? `bill ${billNo}` : "the new bill";
    const partyId = text(bill?.partyId, 40) || undefined;
    const soldTo = text(bill?.soldTo, 60) || undefined;
    const cashName = text(bill?.cashName, 60) || undefined;
    const cashMobile = text(bill?.cashMobile, 20) || undefined;
    const place = text(bill?.place, 60) || undefined;
    const amount = money(bill?.amount);
    if (amount === null) return { ok: false, problem: "Enter each bill's amount in rupees." };
    if (billLines.length === 0 && amount === 0 && !soldTo && !partyId) continue;
    if (billLines.length === 0) return { ok: false, problem: `Enter how much is on ${name}.` };
    if (amount === 0) return { ok: false, problem: `Enter the amount of ${name}.` };
    const date = isDate(bill?.date) && bill.date >= lorry.invoiceDate ? bill.date : undefined;
    if (bill?.date && !date) return { ok: false, problem: `${name[0].toUpperCase()}${name.slice(1)} can't be dated before the lorry's invoice date.` };
    bills.push({ date, billNo, partyId, soldTo, cashName, cashMobile, place, lines: billLines, amount });
  }
  // What is sold of each item: the bills added up, never more than came on the lorry.
  const lines: NonNullable<Lorry["sale"]>["lines"] = [];
  for (const loaded of lorry.lines) {
    const qty = bills.reduce((s, b) => s + (b.lines.find((l) => l.productId === loaded.productId)?.qty ?? 0), 0);
    if (qty > loaded.qty) return { ok: false, problem: `Sold can't be more than came on the lorry (${loaded.qty}).` };
    lines.push({ productId: loaded.productId, qty });
  }
  const typed = money(input.invoiceValue);
  if (typed === null) return { ok: false, problem: "Enter the total invoice value in rupees." };
  const invoiceValue = typed || Math.round(bills.reduce((s, b) => s + b.amount, 0) * 100) / 100;
  if (bills.length && !(invoiceValue > 0)) return { ok: false, problem: "Enter the total invoice value." };
  const invoiceNo = bills.map((b) => b.billNo).join(", ") || undefined;
  const unloading = input.unloadingCharges ? money(input.unloading) : 0;
  const others: { name: string; amount: number }[] = [];
  for (const c of Array.isArray(input.others) ? input.others.slice(0, 50) : []) {
    const amount = money(c?.amount);
    const name = text(c?.name, 40);
    if (amount === null) return { ok: false, problem: "Enter the charges in rupees." };
    if (amount === 0) continue;
    if (!name) return { ok: false, problem: "Enter a name for each other charge." };
    others.push({ name, amount });
  }
  const other = Math.round(others.reduce((s, c) => s + c.amount, 0) * 100) / 100;
  if (unloading === null) return { ok: false, problem: "Enter the charges in rupees." };
  const notes = text(input.notes, 200) || undefined;
  const today = await getToday();
  const sale = { lines, bills, invoiceNo, invoiceValue, unloading: unloading || undefined, other: other || undefined, others: others.length ? others : undefined, notes, updatedOn: today };
  const value = lorrySaleValue({ sale, unloadingCharges: Boolean(input.unloadingCharges) });

  let sold: Lorry["sold"];
  if (input.soldOut) {
    if (!isDate(input.soldOn) || input.soldOn < lorry.invoiceDate) return { ok: false, problem: "Enter the day it sold out (not before the invoice date)." };
    if (!(value > 0)) return { ok: false, problem: "Enter what was sold before marking it sold out." };
    sold = { on: input.soldOn, value, notes };
  }
  // New bills are numbered here, next in the series that godown and lorry bills share.
  const { saved, numbers } = await updateLorryBills(id, { sale, sold, invoicePaperKept: Boolean(input.invoicePaperKept), unloadingCharges: Boolean(input.unloadingCharges) });
  return saved ? { ok: true, billNumbers: numbers } : { ok: false, problem: "That lorry is no longer there. Reload the page." };
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
      // Older lorries kept the driver's name; a number typed there is kept as their mobile.
      driverMobile: mobileOf(old.driverName ?? "").length === 10 ? old.driverName : "",
      invoiceDate: invoiceDate ?? "",
      lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
      invoiceValue: lines.length > 0 && lines.every((l) => l.rate) ? lines.reduce((s, l) => s + (l.rate ?? 0) * l.qty, 0) : 0,
    }, false);
    if (typeof lorry === "string") {
      skipped++;
      continue;
    }
    // An older lorry keeps the company's invoice number and tick boxes it was saved with.
    const added = await addLorryPurchase({
      ...lorry,
      invoiceNo: text(old.invoiceNo, 40) || undefined,
      invoicePaperKept: Boolean(old.invoicePaperKept),
      unloadingCharges: Boolean(old.unloadingCharges),
    });
    const value = money(old.closed?.value);
    if (value && old.closed && isDate(old.closed.on)) {
      await updateLorry(added.id, { sold: { on: old.closed.on, value }, invoicePaperKept: added.invoicePaperKept, unloadingCharges: added.unloadingCharges });
    }
    saved++;
  }
  return { ok: true, saved, skipped };
}

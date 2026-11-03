"use server";

import { addChitRecord, addRentalRecord, deleteChit, deleteRental, getChits, getCurrentUser, getRentals, recordChitLifted, recordChitPayment, recordRentPayment } from "@/lib/data";
import { shiftMonth } from "@/lib/format";
import { isPersonalUnlocked } from "@/lib/personal-lock";

export type RecordResult = { ok: true } | { ok: false; problem: string };

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isMonth = (v: unknown): v is string => typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
/** Rupees rounded to paise, or null when it isn't a sensible amount. */
const money = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100_000_000 ? Math.round(v * 100) / 100 : null);
const whole = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null);

/** Personal records are the owner's, and only while Personal is unlocked with the PIN. */
async function locked(): Promise<string | null> {
  if ((await getCurrentUser()).role !== "owner") return "Only the owner can change personal records.";
  if (!(await isPersonalUnlocked())) return "Personal is locked. Enter the PIN again.";
  return null;
}

// ── Chits ────────────────────────────────────────────────────────────────────

export type ChitInput = {
  organiser: string;
  chitNo: string;
  scope: "business" | "personal";
  totalValue: number;
  months: number;
  instalment: number;
  startDate: string;
  paidMonths: number;
  paidBefore: number | null;
};

export async function addChit(input: ChitInput): Promise<RecordResult> {
  const problem = await locked();
  if (problem) return { ok: false, problem };
  const organiser = text(input?.organiser, 60);
  if (organiser.length < 2) return { ok: false, problem: "Enter the chit company." };
  const totalValue = money(input.totalValue);
  if (!totalValue) return { ok: false, problem: "Enter the chit value." };
  const months = whole(input.months, 1, 120);
  if (!months) return { ok: false, problem: "Enter how many months the chit runs (1 to 120)." };
  const instalment = money(input.instalment);
  if (!instalment) return { ok: false, problem: "Enter the monthly instalment." };
  if (!isDate(input.startDate)) return { ok: false, problem: "Enter the first instalment date." };
  const paidMonths = whole(input.paidMonths, 0, months);
  if (paidMonths === null) return { ok: false, problem: "Instalments already paid can't be more than the months." };
  const paidBefore = input.paidBefore === null || paidMonths === 0 ? undefined : money(input.paidBefore);
  if (paidBefore === null) return { ok: false, problem: "Enter what was paid so far in rupees." };
  await addChitRecord({
    organiser,
    chitNo: text(input.chitNo, 30),
    scope: input.scope === "business" ? "business" : "personal",
    totalValue,
    months,
    instalment,
    startDate: input.startDate,
    dueDay: Number(input.startDate.slice(8, 10)),
    paidMonths,
    paidBefore,
  });
  return { ok: true };
}

/** The next instalment: the day it was paid and what was paid (it can be less than the full instalment). */
export async function recordInstalment(id: string, input: { date: string; amount: number }): Promise<RecordResult> {
  const problem = await locked();
  if (problem) return { ok: false, problem };
  const chit = (await getChits()).find((c) => c.id === id);
  if (!chit) return { ok: false, problem: "That chit is no longer there. Reload the page." };
  if (!chit.original) return { ok: false, problem: "This is a sample chit; only chits you add can be recorded." };
  if (chit.paidMonths >= chit.months) return { ok: false, problem: "Every instalment of this chit is already paid." };
  if (!isDate(input?.date)) return { ok: false, problem: "Enter the day it was paid." };
  const amount = money(input.amount);
  if (!amount || amount > chit.instalment * 10) return { ok: false, problem: "Enter the amount paid." };
  await recordChitPayment(id, { month: chit.paidMonths + 1, date: input.date, amount });
  return { ok: true };
}

/** The month the chit was lifted (taken) and what was received. */
export async function recordLifted(id: string, input: { month: number; amount: number; date: string }): Promise<RecordResult> {
  const problem = await locked();
  if (problem) return { ok: false, problem };
  const chit = (await getChits()).find((c) => c.id === id);
  if (!chit) return { ok: false, problem: "That chit is no longer there. Reload the page." };
  if (!chit.original) return { ok: false, problem: "This is a sample chit; only chits you add can be recorded." };
  if (chit.lifted) return { ok: false, problem: "This chit is already lifted." };
  const month = whole(input?.month, 1, chit.months);
  if (!month) return { ok: false, problem: `Enter the month it was lifted (1 to ${chit.months}).` };
  const amount = money(input.amount);
  if (!amount || amount > chit.totalValue) return { ok: false, problem: "Enter the amount received (not more than the chit value)." };
  if (!isDate(input.date)) return { ok: false, problem: "Enter the day it was lifted." };
  await recordChitLifted(id, { month, amount, date: input.date });
  return { ok: true };
}

// ── Rents ────────────────────────────────────────────────────────────────────

export type RentInput = {
  direction: "received" | "paid";
  property: string;
  counterparty: string;
  phone: string;
  monthlyRent: number;
  dueDay: number;
  advance: number;
  agreementEnd: string;
  paidThrough: string;
  scope: "business" | "personal";
};

export async function addRent(input: RentInput): Promise<RecordResult> {
  const problem = await locked();
  if (problem) return { ok: false, problem };
  const property = text(input?.property, 80);
  if (property.length < 2) return { ok: false, problem: "Enter the property." };
  const counterparty = text(input.counterparty, 60);
  if (counterparty.length < 2) return { ok: false, problem: input.direction === "paid" ? "Enter the owner's name." : "Enter the tenant's name." };
  const phone = text(input.phone, 15).replace(/\D/g, "");
  if (phone && phone.length !== 10) return { ok: false, problem: "Enter a 10-digit mobile number, or leave it empty." };
  const monthlyRent = money(input.monthlyRent);
  if (!monthlyRent) return { ok: false, problem: "Enter the monthly rent." };
  const dueDay = whole(input.dueDay, 1, 31);
  if (!dueDay) return { ok: false, problem: "Enter the day of the month the rent is due (1 to 31)." };
  const advance = money(input.advance);
  if (advance === null) return { ok: false, problem: "Enter the advance in rupees, or 0." };
  if (!isDate(input.agreementEnd)) return { ok: false, problem: "Enter when the agreement ends." };
  if (!isMonth(input.paidThrough)) return { ok: false, problem: "Choose the month the rent is paid up to." };
  await addRentalRecord({
    property,
    direction: input.direction === "paid" ? "paid" : "received",
    counterparty,
    phone: phone || undefined,
    monthlyRent,
    advance,
    dueDay,
    agreementEnd: input.agreementEnd,
    paidThrough: input.paidThrough,
    scope: input.scope === "business" ? "business" : "personal",
  });
  return { ok: true };
}

/** One month's rent received (or paid): the month after the one it was paid up to. */
export async function recordRent(id: string, input: { date: string; amount: number }): Promise<RecordResult> {
  const problem = await locked();
  if (problem) return { ok: false, problem };
  const rental = (await getRentals()).find((r) => r.id === id);
  if (!rental) return { ok: false, problem: "That rent is no longer there. Reload the page." };
  if (!rental.original) return { ok: false, problem: "This is a sample rent; only rents you add can be recorded." };
  if (!isDate(input?.date)) return { ok: false, problem: "Enter the day it was paid." };
  const amount = money(input.amount);
  if (!amount) return { ok: false, problem: "Enter the amount." };
  await recordRentPayment(id, { month: shiftMonth(rental.paidThrough, 1), date: input.date, amount });
  return { ok: true };
}

// ── Deleting ─────────────────────────────────────────────────────────────────

export async function removeChit(id: string): Promise<RecordResult> {
  const problem = await locked();
  if (problem) return { ok: false, problem };
  return (await deleteChit(String(id))) ? { ok: true } : { ok: false, problem: "Only chits you added can be deleted." };
}

export async function removeRent(id: string): Promise<RecordResult> {
  const problem = await locked();
  if (problem) return { ok: false, problem };
  return (await deleteRental(String(id))) ? { ok: true } : { ok: false, problem: "Only rents you added can be deleted." };
}

/**
 * Data access for every screen: the sample books, with the firm's own records (local-data.ts, kept in local-data/
 * or in Supabase by store.ts) in their place. Screens only call these functions.
 */
import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { requireSession } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { billName } from "@/lib/labels";
import { checkCredit, toMT } from "@/lib/sales";
import * as base from "./sample";
import * as base2 from "./sample-phase2";
import * as base3 from "./sample-phase3";
import * as base4 from "./sample-phase4";
import { loadFirms } from "./firms";
import { addLocalCustomer, addLocalDestination, addLocalNote, addLocalRentDriver, loadLocal, localRentDrivers, removeLocalChit, removeLocalDestination, removeLocalLorry, removeLocalParty, removeLocalProduct, removeLocalRentDriver, removeLocalRental, localCheckIns, saveLocalCheckIn, localChits, localDestinations, localRentals, saveLocalChit, saveLocalRental, localLorries, notesOf, ownerDesignation, removeLocalNote, saveLocalLorry, saveLocalProduct } from "./local-data";
import { loadFleet } from "./sample-fleet";
import * as phase5 from "./sample-phase5";
import { saving, syncRecords, whenRecordsChange } from "./store";
import type { Ageing, AttendanceRecord, BankEntry, CashHolder, Chit, LedgerEntry, Lorry, Party, Product, Profile, Rental, Sale } from "./types";
import { LATE_AFTER_MINUTES, WORK_STARTS_AT } from "@/lib/limits";

export type * from "./types";

/** The fixed records (firm, products, people, banks, vehicles' chart) plus the dated ones built for `today`. */
function buildBooks(today: string) {
  const book = base.buildSample(today);
  const [dated2, dated3, dated4] = [base2.buildPhase2(book), base3.buildPhase3(book), base4.buildPhase4(book)];
  return {
    sample: { ...base, ...book },
    phase2: { ...base2, ...dated2 },
    phase3: { ...base3, ...dated3 },
    phase4: { ...base4, ...dated4 },
  };
}
type Books = ReturnType<typeof buildBooks>;
let builtFor = "";
let sample: Books["sample"];
let phase2: Books["phase2"];
let phase3: Books["phase3"];
let phase4: Books["phase4"];

// When the records change on another server (online), every list built from them is built again, in the order they
// depend on each other, and the dated books with them.
whenRecordsChange(() => {
  loadLocal();
  loadFleet();
  base.loadMasters();
  base2.loadPhase2();
  base3.loadPhase3();
  builtFor = "";
});

/** The latest records, fetched once per request (online; on a computer there is nothing to fetch). */
const synced = cache(syncRecords);

/**
 * Today's date in India (YYYY-MM-DD), with the latest records and the sample records brought up to it; they are
 * rebuilt when the date changes. Every reader of records awaits this first. It waits for the request (connection),
 * so neither a date nor a record is ever frozen into a page at build time.
 */
async function live() {
  await connection();
  await synced();
  const today = todayISO();
  if (today !== builtFor) {
    ({ sample, phase2, phase3, phase4 } = buildBooks(today));
    builtFor = today;
  }
  return today;
}

/** Today (YYYY-MM-DD) in India time, for every screen. */
export async function getToday() {
  return live();
}

/** The time now (ms since 1970), read at request time; clocks on the page tick on from it. */
export async function getNow() {
  await connection();
  return Date.now();
}

export type PartyWithBalance = Party & {
  /** Positive = they owe us (Dr); negative = we owe them (Cr). */
  balance: number;
  overdue30: number;
};
export type SaleWithParty = Sale & { partyName: string };

// ── Masters ──────────────────────────────────────────────────────────────────

/** The primary firm: sales are billed from it, and it heads the sign-in page, reports and statements. */
export async function getFirm() {
  const firms = await loadFirms();
  return firms.find((f) => f.primary) ?? firms[0];
}

/** Every firm the owner has, in the order they were added (one of them is marked primary). */
export async function getFirms() {
  return loadFirms();
}

/** The signed-in person, from the session (signing in again if there is none). */
export async function getCurrentUser(): Promise<Profile> {
  const { userId } = await requireSession();
  await synced();
  return base.profiles.find((p) => p.id === userId) ?? base.profiles[0];
}

// ── Destinations (New sale › Destination) ─────────────────────────────────────────────────────────────────────

/** The villages and towns we deliver to, A to Z. */
export async function getDestinations(): Promise<string[]> {
  await live();
  return [...localDestinations()].sort((a, b) => a.localeCompare(b));
}

export async function deleteDestination(name: string): Promise<boolean> {
  return saving(() => removeLocalDestination(name));
}

/** Adds a destination unless it is already there (any capitals); returns the name as saved. */
export async function addDestination(name: string): Promise<{ name: string; added: boolean }> {
  return saving(() => {
    const existing = localDestinations().find((d) => d.toLowerCase() === name.toLowerCase());
    if (existing) return { name: existing, added: false };
    addLocalDestination(name);
    return { name, added: true };
  });
}

/** Drivers of rented vehicles, A to Z (New sale › Rent › Driver). */
export async function getRentDrivers(): Promise<string[]> {
  await live();
  return [...localRentDrivers()].sort((a, b) => a.localeCompare(b));
}

export async function deleteRentDriver(name: string): Promise<boolean> {
  return saving(() => removeLocalRentDriver(name));
}

/** Adds a rent driver unless already there (any capitals); returns the name as saved. */
export async function addRentDriver(name: string): Promise<{ name: string; added: boolean }> {
  return saving(() => {
    const existing = localRentDrivers().find((d) => d.toLowerCase() === name.toLowerCase());
    if (existing) return { name: existing, added: false };
    addLocalRentDriver(name);
    return { name, added: true };
  });
}

// ── Quick notes (the floating notes ball): each signed-in person's own ─────────────────────────────────────────

export type QuickNote = { id: string; text: string; at: string };

export async function getMyQuickNotes(): Promise<QuickNote[]> {
  const me = await getCurrentUser();
  return notesOf(me.id).map(({ id, text, at }) => ({ id, text, at }));
}

export async function addMyQuickNote(text: string): Promise<QuickNote> {
  const me = await getCurrentUser();
  const note = { id: `note-${Date.now().toString(36)}`, profileId: me.id, text, at: new Date().toISOString() };
  await saving(() => addLocalNote(note));
  return { id: note.id, text: note.text, at: note.at };
}

export async function removeMyQuickNote(id: string): Promise<boolean> {
  const me = await getCurrentUser();
  return saving(() => removeLocalNote(me.id, id));
}

/** The people the app's frame needs: everyone for the owner ("View as" previews a role's first person), only themself for anyone else. */
export async function getShellProfiles(): Promise<Profile[]> {
  const me = await getCurrentUser();
  return me.role === "owner" ? base.profiles : [me];
}

export async function getProfiles() {
  await live();
  return base.profiles;
}

export async function getProfile(id: string | undefined) {
  await live();
  return base.profiles.find((p) => p.id === id);
}

/** Every godown (for names and lookups); lists a person sees use getMyGodowns. */
export async function getGodowns() {
  await live();
  return base.godowns;
}

/**
 * The godowns the signed-in person may see. Someone who is a godown's in-charge (Settings › Godowns) sees only the
 * godowns they look after, with only those godowns' stock, purchases, sales and transfers; the owner and staff who
 * look after no godown see them all. Null means every godown.
 */
async function visibleGodowns(): Promise<Set<string> | null> {
  const user = await getCurrentUser();
  if (user.role === "owner") return null;
  const mine = base.godowns.filter((g) => g.inCharge?.includes(user.id)).map((g) => g.id);
  return mine.length > 0 ? new Set(mine) : null;
}

const canSee = (visible: Set<string> | null, godownId: string | undefined) => visible === null || (godownId !== undefined && visible.has(godownId));

/** The godowns the signed-in person may see and pick (stock, Load from, Unload at…). */
export async function getMyGodowns() {
  const visible = await visibleGodowns();
  return base.godowns.filter((g) => canSee(visible, g.id));
}

export async function getProducts() {
  await live();
  return base.products;
}

/** Settings › Products: deletes a product; a reason when it can't be (a sample product, or one on a saved lorry). */
export async function deleteProduct(id: string): Promise<string | null> {
  return saving(() => {
    if (localLorries().some((l) => l.lines.some((x) => x.productId === id))) return "A saved lorry has this product, so it can't be deleted.";
    if (!removeLocalProduct(base.products, id)) return "Only products you added can be deleted.";
    return null;
  });
}

/** Settings › Products: adds a product (a company's cement type, or a steel item). It has no rate; the owner prices each bill. */
export async function addProduct(input: { brand: string; variant: string; category: Product["category"] }): Promise<Product> {
  const slug = `${input.brand}-${input.variant}`.toLowerCase().replace(/\+/g, "-plus").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return saving(() => {
    let id = `p-${slug}`;
    for (let n = 2; base.products.some((p) => p.id === id); n++) id = `p-${slug}-${n}`;
    const product: Product = {
      id,
      name: `${input.brand} ${input.variant}`,
      brand: input.brand,
      variant: input.variant,
      category: input.category,
      unit: input.category === "cement" ? "bag" : "kg",
      active: true,
    };
    saveLocalProduct(base.products, product);
    return product;
  });
}

// ── Parties and ledgers ──────────────────────────────────────────────────────

function ledgerFor(partyId: string): LedgerEntry[] {
  const party = sample.parties.find((p) => p.id === partyId);
  if (!party) return [];
  const rows: Omit<LedgerEntry, "balance">[] = [];
  if (party.openingBalance !== 0) {
    rows.push({
      date: sample.OPENING_DATE,
      kind: "opening",
      ref: "Opening",
      narration: "Opening balance",
      debit: Math.max(party.openingBalance, 0),
      credit: Math.max(-party.openingBalance, 0),
    });
  }
  sample.sales
    .filter((s) => s.partyId === partyId && s.status === "saved")
    .forEach((s) =>
      rows.push({
        date: s.billDate,
        kind: "sale",
        ref: `Bill ${s.billNo}`,
        href: `/sales/${s.id}`,
        narration: s.lines.map((l) => sample.products.find((p) => p.id === l.productId)?.name).join(", "),
        debit: s.total,
        credit: 0,
      }),
    );
  sample.receipts
    .filter((r) => r.partyId === partyId)
    .forEach((r) =>
      rows.push({
        date: r.date,
        kind: "receipt",
        ref: `Receipt ${r.receiptNo}`,
        narration: `Received by ${r.mode.toUpperCase()}${r.reference ? ` · ${r.reference}` : ""}`,
        debit: 0,
        credit: r.amount,
      }),
    );
  sample.purchases
    .filter((p) => p.companyId === partyId)
    .forEach((p) =>
      rows.push({
        date: p.invoiceDate,
        kind: "purchase",
        ref: `Purchase ${p.purchaseNo}`,
        href: `/purchases/${p.id}`,
        narration: `Invoice ${p.invoiceNo} · lorry ${p.lorryNo}`,
        debit: 0,
        credit: p.total,
      }),
    );
  sample.payments
    .filter((p) => p.partyId === partyId)
    .forEach((p) =>
      rows.push({
        date: p.date,
        kind: "payment",
        ref: `Payment ${p.paymentNo}`,
        narration: `Paid by ${p.mode.toUpperCase()}${p.reference ? ` · ${p.reference}` : ""}`,
        debit: p.amount,
        credit: 0,
      }),
    );

  phase2.badDebts
    .filter((b) => b.partyId === partyId)
    .forEach((b) =>
      rows.push({
        date: b.date,
        kind: "writeoff",
        ref: "Written off",
        href: "/money/bad-debts",
        narration: `Bad debt: ${b.reason}`,
        debit: 0,
        credit: b.amount,
      }),
    );

  const order = { opening: 0, sale: 1, purchase: 1, receipt: 2, payment: 2, writeoff: 3 };
  rows.sort((a, b) => a.date.localeCompare(b.date) || order[a.kind] - order[b.kind]);
  let balance = 0;
  return rows.map((r) => {
    balance += r.debit - r.credit;
    return { ...r, balance };
  });
}

function daysBetween(fromIso: string, toIso: string) {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);
}

/** Unpaid amounts by age; payments clear the oldest bills first. */
function ageingFor(partyId: string): Ageing {
  const ageing: Ageing = { "0-7": 0, "8-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  const entries = ledgerFor(partyId);
  let credits = entries.reduce((s, e) => s + e.credit, 0);
  for (const e of entries.filter((x) => x.debit > 0)) {
    const unpaid = Math.max(0, e.debit - credits);
    credits = Math.max(0, credits - e.debit);
    if (unpaid === 0) continue;
    // The opening balance is treated as at least 45 days old.
    const age = e.kind === "opening" ? Math.max(45, daysBetween(e.date, sample.SAMPLE_TODAY)) : daysBetween(e.date, sample.SAMPLE_TODAY);
    const bucket = age <= 7 ? "0-7" : age <= 30 ? "8-30" : age <= 60 ? "31-60" : age <= 90 ? "61-90" : "90+";
    ageing[bucket] += unpaid;
  }
  return ageing;
}

function withBalance(party: Party): PartyWithBalance {
  const ledger = ledgerFor(party.id);
  const ageing = ageingFor(party.id);
  return {
    ...party,
    balance: ledger.at(-1)?.balance ?? 0,
    overdue30: ageing["31-60"] + ageing["61-90"] + ageing["90+"],
  };
}

export async function getParties(): Promise<PartyWithBalance[]> {
  await live();
  return sample.parties.map(withBalance);
}

/** Adds a customer or sub-dealer (New sale › New customer); they can be billed straight away. No credit until the owner sets a limit. */
export async function addCustomer(input: { name: string; mobile: string; place: string; kind: "customer" | "sub_dealer" }): Promise<PartyWithBalance> {
  return addParty({ name: input.name, kind: input.kind, place: input.place || undefined, mobile: input.mobile, creditLimit: null, openingBalance: 0 });
}

/** Parties › New party: a customer, sub-dealer, supplier or lorry owner, saved straight away. */
export async function addParty(input: Omit<Party, "id" | "original">): Promise<PartyWithBalance> {
  await live();
  const party: Party = { ...input, id: `c-${Date.now().toString(36)}` };
  await saving(() => addLocalCustomer(base.parties, party));
  return withBalance(party);
}

/** Deletes a party added in the app or a real supplier; false for a sample party. */
export async function deleteParty(id: string): Promise<boolean> {
  return saving(() => removeLocalParty(base.parties, id));
}

export async function getParty(id: string): Promise<PartyWithBalance | undefined> {
  await live();
  const party = sample.parties.find((p) => p.id === id);
  return party && withBalance(party);
}

export async function getPartyLedger(id: string) {
  await live();
  return ledgerFor(id);
}

export async function getPartyAgeing(id: string) {
  await live();
  return ageingFor(id);
}

// ── Sales, quotations, purchases, money ─────────────────────────────────────

const partyName = (id: string) => sample.parties.find((p) => p.id === id)?.name ?? "Unknown party";
const newestFirst = <T extends { date?: string; billDate?: string }>(a: T, b: T) =>
  (b.billDate ?? b.date ?? "").localeCompare(a.billDate ?? a.date ?? "");

// Within a day, sales still waiting for a bill no. come first.
const billOrder = (s: Sale) => s.billNo ?? Number.MAX_SAFE_INTEGER;

/** The number the next bill would take: one after the highest so far. The owner can change it when approving. */
export async function getNextBillNo(): Promise<number> {
  await live();
  return sample.sales.reduce((max, s) => Math.max(max, s.billNo ?? 0), 0) + 1;
}

export async function getSales(): Promise<SaleWithParty[]> {
  await live();
  const visible = await visibleGodowns();
  return sample.sales
    .filter((s) => canSee(visible, s.godownId))
    .map((s) => ({ ...s, partyName: partyName(s.partyId) }))
    .sort((a, b) => newestFirst(a, b) || billOrder(b) - billOrder(a));
}

export async function getSale(id: string): Promise<SaleWithParty | undefined> {
  await live();
  const visible = await visibleGodowns();
  const sale = sample.sales.find((s) => s.id === id && canSee(visible, s.godownId));
  return sale && { ...sale, partyName: partyName(sale.partyId) };
}

export async function getQuotations() {
  await live();
  return [...sample.quotations].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getQuotation(id: string) {
  await live();
  return sample.quotations.find((q) => q.id === id);
}

/** Standard terms printed on every new quotation; editable per quotation. */
export async function getQuotationTerms() {
  return base.defaultTerms();
}

export async function getPurchases() {
  await live();
  const visible = await visibleGodowns();
  return sample.purchases
    .filter((p) => canSee(visible, p.godownId))
    .map((p) => ({ ...p, companyName: partyName(p.companyId) }))
    .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
}

export async function getPurchase(id: string) {
  await live();
  const visible = await visibleGodowns();
  const purchase = sample.purchases.find((p) => p.id === id && canSee(visible, p.godownId));
  return purchase && { ...purchase, companyName: partyName(purchase.companyId) };
}

export async function getReceipts() {
  await live();
  return sample.receipts
    .map((r) => ({ ...r, partyName: partyName(r.partyId) }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.receiptNo - a.receiptNo);
}

export async function getPayments() {
  await live();
  return sample.payments
    .map((p) => ({ ...p, partyName: partyName(p.partyId) }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.paymentNo - a.paymentNo);
}

// ── Stock ────────────────────────────────────────────────────────────────────

export async function getStockBalances() {
  await live();
  const visible = await visibleGodowns();
  const totals = new Map<string, { godownId: string; productId: string; qty: number }>();
  for (const m of sample.stockMovements.filter((x) => canSee(visible, x.godownId))) {
    const key = `${m.godownId}|${m.productId}`;
    const row = totals.get(key) ?? { godownId: m.godownId, productId: m.productId, qty: 0 };
    row.qty += m.qty;
    totals.set(key, row);
  }
  return [...totals.values()];
}

/** Every movement including opening stock, for the stock summary report. */
export async function getAllStockMovements() {
  await live();
  const visible = await visibleGodowns();
  return sample.stockMovements.filter((m) => canSee(visible, m.godownId));
}

export async function getStockMovements() {
  await live();
  const visible = await visibleGodowns();
  return sample.stockMovements.filter((m) => m.kind !== "opening" && canSee(visible, m.godownId)).sort((a, b) => b.date.localeCompare(a.date));
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboard() {
  await live();
  const today = sample.SAMPLE_TODAY;
  const todays = sample.sales.filter((s) => s.billDate === today && s.status === "saved");
  const lineQty = (category: "cement" | "steel") =>
    todays
      .flatMap((s) => s.lines)
      .filter((l) => sample.products.find((p) => p.id === l.productId)?.category === category)
      .reduce((sum, l) => sum + l.qty, 0);

  const parties = await getParties();
  const customers = parties.filter((p) => p.kind !== "company" && p.kind !== "lorry_owner");

  const pending = sample.sales.filter((s) => s.status === "pending_approval");
  const approvals = pending.map((s) => {
    const party = parties.find((p) => p.id === s.partyId)!;
    const credit = checkCredit(party.creditLimit, party.balance, s.total);
    return {
      id: s.id,
      title: `${party.name} · ${billName(s)}`,
      detail: credit?.overLimit ? `Over credit limit by ₹${credit.over.toLocaleString("en-IN")}` : "Staff sale: add the bill no. and prices, then approve",
      href: `/sales/${s.id}`,
    };
  });

  const cashWithStaff = (await getCashSummary())
    .filter((h) => h.role === "field")
    .map((h) => ({
      id: h.holder,
      name: h.name,
      amount: h.closing,
      collectedToday: h.collections,
      handedOver: phase2.handovers.some((x) => x.date === today && x.from === h.holder && x.to === phase2.OFFICE),
    }));

  const upcoming = [
    ...(await getPolicies()).filter((p) => p.daysLeft >= 0 && p.daysLeft <= 7).map((p) => ({ id: p.id, title: `${p.title} insurance`, when: inDays(p.daysLeft), href: "/personal/insurance" })),
    ...(await getChits()).filter((c) => c.daysToDue >= 0 && c.daysToDue <= 7).map((c) => ({ id: c.id, title: "Chit instalment", when: inDays(c.daysToDue), href: "/personal/chits" })),
    ...(await getRentals()).filter((r) => r.status === "overdue").map((r) => ({ id: r.id, title: `Rent ${r.direction === "received" ? "from" : "to"} ${r.counterparty}`, when: "overdue", href: "/personal/rents" })),
  ];

  return {
    date: today,
    sales: {
      amount: todays.reduce((s, x) => s + x.total, 0),
      cementBags: lineQty("cement"),
      steelMT: toMT(lineQty("steel"), "kg"),
      bills: todays.length,
    },
    collected: sample.receipts.filter((r) => r.date === today).reduce((s, r) => s + r.amount, 0),
    outstanding: customers.reduce((s, p) => s + Math.max(p.balance, 0), 0),
    overdue30: customers.reduce((s, p) => s + p.overdue30, 0),
    approvals,
    upcoming,
    cashWithStaff,
  };
}

function inDays(days: number) {
  return days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
}

// ── Staff cash ───────────────────────────────────────────────────────────────

export type CashEntry = {
  date: string;
  kind: "collection" | "handover_in" | "handover_out" | "expense" | "payment" | "deposit";
  description: string;
  /** Positive = cash came in, negative = cash went out. */
  amount: number;
  href?: string;
};

export type CashDay = {
  date: string;
  opening: number;
  cashIn: number;
  cashOut: number;
  closing: number;
  counted?: number;
};

function holderName(holder: CashHolder) {
  if (holder === phase2.OFFICE) return "Office cash";
  if (holder.startsWith("bank:")) return phase2.bankAccounts.find((a) => `bank:${a.id}` === holder)?.name ?? "Bank";
  return sample.profiles.find((p) => p.id === holder)?.fullName ?? holder;
}

function cashEntries(holder: CashHolder): CashEntry[] {
  const entries: CashEntry[] = [];
  sample.receipts
    .filter((r) => r.mode === "cash" && phase2.cashHolderOf(r) === holder)
    .forEach((r) =>
      entries.push({
        date: r.date,
        kind: "collection",
        description: `Receipt ${r.receiptNo} · ${partyName(r.partyId)}`,
        amount: r.amount,
        href: `/parties/${r.partyId}`,
      }),
    );
  phase2.handovers
    .filter((h) => h.from === holder || h.to === holder)
    .forEach((h) => {
      const outgoing = h.from === holder;
      entries.push({
        date: h.date,
        kind: outgoing ? (h.to.startsWith("bank:") ? "deposit" : "handover_out") : "handover_in",
        description: outgoing ? `${h.to.startsWith("bank:") ? "Deposited to" : "Handed to"} ${holderName(h.to)}` : `Received from ${holderName(h.from)}`,
        amount: outgoing ? -h.amount : h.amount,
      });
    });
  phase2.expenses
    .filter((e) => e.paidFrom === "cash" && e.paidBy === holder)
    .forEach((e) => entries.push({ date: e.date, kind: "expense", description: `${e.description}`, amount: -e.amount, href: "/money/expenses" }));
  if (holder === phase2.OFFICE) {
    sample.payments
      .filter((p) => p.mode === "cash")
      .forEach((p) => entries.push({ date: p.date, kind: "payment", description: `Payment ${p.paymentNo} · ${partyName(p.partyId)}`, amount: -p.amount }));
  }
  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

/** Day by day: opening + cash in − cash out = closing (the owner's own formula from the notebook). */
function cashDays(holder: CashHolder): CashDay[] {
  const entries = cashEntries(holder);
  const days: CashDay[] = [];
  let balance = phase2.openingCash[holder] ?? 0;
  for (let day = sample.OPENING_DATE; day <= sample.SAMPLE_TODAY; day = nextDay(day)) {
    const todays = entries.filter((e) => e.date === day);
    const cashIn = todays.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
    const cashOut = Math.abs(todays.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0));
    const opening = balance;
    balance = opening + cashIn - cashOut;
    if (cashIn || cashOut || day === sample.SAMPLE_TODAY) {
      days.push({
        date: day,
        opening,
        cashIn,
        cashOut,
        closing: balance,
        counted: phase2.cashCounts.find((c) => c.holder === holder && c.date === day)?.counted,
      });
    }
  }
  return days;
}

function nextDay(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** People who hold business cash: the office box, sales & collection staff and drivers. */
async function getCashHolders() {
  return [
    { holder: phase2.OFFICE, name: "Office cash", role: "office" as const },
    ...sample.profiles.filter((p) => p.role === "field" || p.role === "driver").map((p) => ({ holder: p.id, name: p.fullName, role: p.role })),
  ];
}

export async function getCashSummary() {
  await live();
  const holders = await getCashHolders();
  return holders.map((h) => {
    const today = cashDays(h.holder).at(-1)!;
    const todaysEntries = cashEntries(h.holder).filter((e) => e.date === today.date);
    return {
      ...h,
      ...today,
      collections: todaysEntries.filter((e) => e.kind === "collection").reduce((s, e) => s + e.amount, 0),
      difference: today.counted === undefined ? undefined : today.counted - today.closing,
    };
  });
}

export async function getCashBook(holder: CashHolder) {
  await live();
  const holders = await getCashHolders();
  const info = holders.find((h) => h.holder === holder);
  if (!info) return undefined;
  const days = cashDays(holder);
  return { ...info, days: [...days].reverse(), entries: cashEntries(holder).reverse(), today: days.at(-1)! };
}

// ── Expenses ─────────────────────────────────────────────────────────────────

export async function getVehicleNames() {
  await live();
  return base2.vehicleNames;
}

export async function getExpenses() {
  await live();
  return [...phase2.expenses]
    .map((e) => ({
      ...e,
      paidFromLabel: e.paidFrom === "cash" ? `Cash · ${holderName(e.paidBy ?? phase2.OFFICE)}` : holderName(`bank:${e.paidFrom}`),
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.expenseNo - a.expenseNo);
}

// ── Advances and cement commitments ─────────────────────────────────────────

export async function getCommitments() {
  await live();
  return sample.commitments.map((c) => {
    const partySales = sample.sales
      .filter((s) => s.partyId === c.partyId && s.status === "saved" && s.billDate >= c.date)
      .sort((a, b) => a.billDate.localeCompare(b.billDate));
    const supplies: { saleId: string; billNo?: number; date: string; bags: number; amount: number }[] = [];
    if (c.kind === "fixed_price") {
      let left = c.bags ?? 0;
      for (const s of partySales) {
        const bags = s.lines.filter((l) => l.productId === c.productId).reduce((n, l) => n + l.qty, 0);
        const used = Math.min(bags, left);
        if (used > 0) supplies.push({ saleId: s.id, billNo: s.billNo, date: s.billDate, bags: used, amount: used * (c.rate ?? 0) });
        left -= used;
      }
    } else {
      let left = c.amount;
      for (const s of partySales) {
        const used = Math.min(s.total, left);
        if (used > 0) supplies.push({ saleId: s.id, billNo: s.billNo, date: s.billDate, bags: 0, amount: used });
        left -= used;
      }
    }
    const suppliedBags = supplies.reduce((n, x) => n + x.bags, 0);
    const adjusted = supplies.reduce((n, x) => n + x.amount, 0);
    return {
      ...c,
      partyName: partyName(c.partyId),
      productName: sample.products.find((p) => p.id === c.productId)?.name,
      supplies,
      suppliedBags,
      remainingBags: (c.bags ?? 0) - suppliedBags,
      adjusted,
      remainingAmount: c.amount - adjusted,
      status: c.amount - adjusted <= 0 ? ("completed" as const) : ("active" as const),
    };
  });
}

export async function getCommitment(id: string) {
  await live();
  return (await getCommitments()).find((c) => c.id === id);
}

// ── Ageing, reminders and bad debts ─────────────────────────────────────────

export async function getAgeingReport() {
  await live();
  const parties = (await getParties()).filter((p) => p.kind === "customer" || p.kind === "sub_dealer");
  return parties
    .map((p) => {
      const ageing = ageingFor(p.id);
      const unpaid = Object.values(ageing).reduce((s, v) => s + v, 0);
      const lastReminder = phase2.reminders.filter((r) => r.partyId === p.id).sort((a, b) => b.date.localeCompare(a.date))[0];
      const overdue = unpaid - ageing["0-7"];
      return {
        id: p.id,
        name: p.name,
        place: p.place,
        staff: sample.profiles.find((s) => s.id === p.assignedTo)?.fullName,
        ageing,
        unpaid,
        overdue,
        lastReminder,
        // Rule from the plan: remind once a bill passes 7 days, then weekly.
        dueForReminder: overdue > 0 && (!lastReminder || daysBetween(lastReminder.date, sample.SAMPLE_TODAY) >= 7),
      };
    })
    .filter((p) => p.unpaid > 0)
    .sort((a, b) => b.overdue - a.overdue);
}

export async function getReminders() {
  await live();
  return [...phase2.reminders].map((r) => ({ ...r, partyName: partyName(r.partyId) })).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getBadDebts() {
  await live();
  return phase2.badDebts.map((b) => ({ ...b, partyName: partyName(b.partyId), approvedByName: holderName(b.approvedBy) }));
}

// ── Banks ────────────────────────────────────────────────────────────────────

function bankEntries(accountId: string): (BankEntry & { balance: number })[] {
  const entries: BankEntry[] = [];
  const nonCash = (mode: string) => (accountId === "acc-sbi" ? mode === "upi" || mode === "neft" : accountId === "acc-ubi" ? mode === "cheque" : false);
  sample.receipts
    .filter((r) => nonCash(r.mode))
    .forEach((r) => entries.push({ id: r.id, accountId, date: r.date, amount: r.amount, description: `Receipt ${r.receiptNo} · ${partyName(r.partyId)}`, href: `/parties/${r.partyId}` }));
  sample.payments
    .filter((p) => nonCash(p.mode))
    .forEach((p) => entries.push({ id: p.id, accountId, date: p.date, amount: -p.amount, description: `Payment ${p.paymentNo} · ${partyName(p.partyId)}`, href: `/parties/${p.partyId}` }));
  phase2.expenses
    .filter((e) => e.paidFrom === accountId)
    .forEach((e) => entries.push({ id: e.id, accountId, date: e.date, amount: -e.amount, description: e.description, href: "/money/expenses" }));
  phase2.handovers
    .filter((h) => h.to === `bank:${accountId}`)
    .forEach((h) => entries.push({ id: h.id, accountId, date: h.date, amount: h.amount, description: `Cash deposited from ${holderName(h.from)}` }));
  [...phase2.businessBankExtras, ...phase2.personalBankEntries].filter((e) => e.accountId === accountId).forEach((e) => entries.push(e));

  entries.sort((a, b) => a.date.localeCompare(b.date));
  let balance = phase2.bankAccounts.find((a) => a.id === accountId)?.openingBalance ?? 0;
  return entries.map((e) => ({ ...e, balance: (balance += e.amount) }));
}

export async function getBankAccounts(scope: "business" | "personal" = "business") {
  await live();
  return phase2.bankAccounts
    .filter((a) => a.scope === scope)
    .map((a) => ({ ...a, balance: bankEntries(a.id).at(-1)?.balance ?? a.openingBalance }));
}

export async function getBankEntries(accountId: string) {
  await live();
  return bankEntries(accountId).reverse();
}

// ── Personal (owner only) ────────────────────────────────────────────────────

function monthOffset(iso: string, months: number, day: number) {
  const [y, m] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

/** The owner's chits (the ones entered in the app, then the sample ones), with what is paid and the next instalment. */
export async function getChits() {
  await live();
  const today = todayISO();
  return [...localChits(), ...phase2.chits].map((c) => {
    const recorded = c.payments ?? [];
    const paidMonths = c.paidMonths + recorded.length;
    const nextDue = paidMonths < c.months ? monthOffset(c.startDate, paidMonths, c.dueDay) : undefined;
    return {
      ...c,
      paidMonths,
      paid: (c.paidBefore ?? c.paidMonths * c.instalment) + recorded.reduce((s, p) => s + p.amount, 0),
      remainingMonths: c.months - paidMonths,
      nextDue,
      daysToDue: nextDue ? daysBetween(today, nextDue) : -1,
    };
  });
}

/** Personal › Chits › Add chit. */
export async function addChitRecord(chit: Omit<Chit, "id" | "original">): Promise<Chit> {
  const saved = { ...chit, id: `chit-${Date.now().toString(36)}` };
  await saving(() => saveLocalChit(saved));
  return saved;
}

export async function deleteChit(id: string): Promise<boolean> {
  return saving(() => removeLocalChit(id));
}

/** Records the next instalment on a chit entered in the app; false when it isn't one. */
export async function recordChitPayment(id: string, payment: NonNullable<Chit["payments"]>[number]): Promise<boolean> {
  return saving(() => {
    const chit = localChits().find((c) => c.id === id);
    if (!chit) return false;
    saveLocalChit({ ...chit, payments: [...(chit.payments ?? []), payment] });
    return true;
  });
}

/** Records the month the chit was lifted and what was received; false when it isn't one entered in the app. */
export async function recordChitLifted(id: string, lifted: NonNullable<Chit["lifted"]>): Promise<boolean> {
  return saving(() => {
    const chit = localChits().find((c) => c.id === id);
    if (!chit) return false;
    saveLocalChit({ ...chit, lifted });
    return true;
  });
}

/** Rent received and paid (the ones entered in the app, then the sample ones), with what is due this month. */
export async function getRentals() {
  await live();
  const today = todayISO();
  const thisMonth = today.slice(0, 7);
  const day = Number(today.slice(8, 10));
  return [...localRentals(), ...phase2.rentals].map((r) => {
    const status = r.paidThrough >= thisMonth ? ("paid" as const) : day > r.dueDay ? ("overdue" as const) : ("due" as const);
    const [py, pm] = r.paidThrough.split("-").map(Number);
    const [ty, tm] = thisMonth.split("-").map(Number);
    const monthsDue = Math.max(0, ty * 12 + tm - (py * 12 + pm));
    return { ...r, status, amountDue: monthsDue * r.monthlyRent };
  });
}

/** Personal › Rents › Add rent. */
export async function addRentalRecord(rental: Omit<Rental, "id" | "original">): Promise<Rental> {
  const saved = { ...rental, id: `rent-${Date.now().toString(36)}` };
  await saving(() => saveLocalRental(saved));
  return saved;
}

export async function deleteRental(id: string): Promise<boolean> {
  return saving(() => removeLocalRental(id));
}

/** Records the next month's rent on a rent entered in the app; false when it isn't one. */
export async function recordRentPayment(id: string, payment: NonNullable<Rental["payments"]>[number]): Promise<boolean> {
  return saving(() => {
    const rental = localRentals().find((r) => r.id === id);
    if (!rental) return false;
    saveLocalRental({ ...rental, paidThrough: payment.month, payments: [...(rental.payments ?? []), payment] });
    return true;
  });
}

export async function getPolicies() {
  await live();
  return phase2.policies
    .map((p) => ({ ...p, daysLeft: daysBetween(sample.SAMPLE_TODAY, p.nextDue) }))
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue));
}

export async function getNotes() {
  await live();
  return [...phase2.notes].sort((a, b) => Number(b.pinned) - Number(a.pinned));
}

export async function getDocuments() {
  await live();
  return [...phase2.documents].sort((a, b) => b.addedOn.localeCompare(a.addedOn));
}

// ── People: employees, attendance, tours, targets, salary ───────────────────

const staffName = (id: string | undefined) => sample.profiles.find((p) => p.id === id)?.fullName ?? "Office";

const minutesOf = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Every attendance record: the check-ins made in the app, then the sample records for the days without one. The
 * firm's own staff get no sample record from today on, so nobody shows as checked in before they really do.
 */
function attendanceRecords(): AttendanceRecord[] {
  const today = todayISO();
  const real: AttendanceRecord[] = localCheckIns().map((r) => ({
    profileId: r.profileId,
    date: r.date,
    status: "present",
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    late: minutesOf(r.checkIn) > minutesOf(WORK_STARTS_AT) + LATE_AFTER_MINUTES,
    original: true,
  }));
  const recorded = new Set(real.map((r) => `${r.profileId}|${r.date}`));
  const ownStaff = new Set(base.profiles.filter((p) => p.original).map((p) => p.id));
  return [...real, ...phase3.attendance.filter((a) => !recorded.has(`${a.profileId}|${a.date}`) && !(ownStaff.has(a.profileId) && a.date >= today))];
}

const attendanceOn = (profileId: string, date: string, records = attendanceRecords()) => records.find((a) => a.profileId === profileId && a.date === date);

/** The signed-in person's own attendance: today, this month's counts and every day they have, newest first. */
export async function getMyAttendance() {
  await live();
  const me = await getCurrentUser();
  const records = attendanceRecords()
    .filter((a) => a.profileId === me.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  return { today: records.find((a) => a.date === todayISO()), month: attendanceSummary(me.id), records };
}

/** Checks the signed-in person in, or out, now (India time). */
export async function markMyAttendance(kind: "in" | "out"): Promise<{ ok: true; time: string } | { ok: false; problem: string }> {
  const me = await getCurrentUser();
  const date = todayISO();
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  return saving(() => {
    const day = localCheckIns().find((r) => r.profileId === me.id && r.date === date);
    if (kind === "in") {
      if (day) return { ok: false, problem: `You already checked in today at ${day.checkIn}.` };
      saveLocalCheckIn({ profileId: me.id, date, checkIn: time });
    } else {
      if (!day) return { ok: false, problem: "Check in first." };
      if (day.checkOut) return { ok: false, problem: `You already checked out today at ${day.checkOut}.` };
      saveLocalCheckIn({ ...day, checkOut: time });
    }
    return { ok: true, time };
  });
}

function attendanceSummary(profileId: string, records = attendanceRecords()) {
  const month = records.filter((a) => a.profileId === profileId && a.date.startsWith(todayISO().slice(0, 7)));
  const count = (s: string) => month.filter((a) => a.status === s).length;
  return {
    present: count("present"),
    halfDay: count("half_day"),
    leave: count("leave"),
    absent: count("absent"),
    late: month.filter((a) => a.late).length,
    workingDays: month.filter((a) => a.status !== "holiday").length,
  };
}

function loanBalance(loan: (typeof phase3.loans)[number]) {
  return loan.amount - loan.repayments.reduce((s, r) => s + r.amount, 0);
}

/** Each person's designation ("Wholesale manager", "Owner"…), without the day's attendance, so any page can show it. */
export async function getDesignations(): Promise<Record<string, string>> {
  await live();
  return designationsNow();
}

function designationsNow(): Record<string, string> {
  const owner = base.profiles.find((p) => p.role === "owner");
  return { ...(owner ? { [owner.id]: ownerDesignation ?? "Owner" } : {}), ...Object.fromEntries(base3.employees.map((e) => [e.profileId, e.designation])) };
}

/** Everyone who can sign in, with their designation, from one fetch of the records (the sign-in screen). */
export async function getSignInPeople(): Promise<(Profile & { designation: string })[]> {
  await live();
  const designations = designationsNow();
  return base.profiles.filter((p) => p.active).map((p) => ({ ...p, designation: designations[p.id] ?? "" }));
}

export async function getEmployees() {
  await live();
  // Worked out once for everyone, not once per person.
  const records = attendanceRecords();
  const today = todayISO();
  return phase3.employees.map((e) => {
    const profile = sample.profiles.find((p) => p.id === e.profileId)!;
    return {
      ...profile,
      ...e,
      today: attendanceOn(e.profileId, today, records),
      partiesCount: sample.parties.filter((p) => p.assignedTo === e.profileId).length,
      loanBalance: phase3.loans.filter((l) => l.profileId === e.profileId).reduce((s, l) => s + loanBalance(l), 0),
      month: attendanceSummary(e.profileId, records),
    };
  });
}

export async function getEmployee(id: string) {
  await live();
  const employee = (await getEmployees()).find((e) => e.id === id);
  if (!employee) return undefined;
  const parties = (await getParties()).filter((p) => p.assignedTo === id);
  return {
    ...employee,
    attendance: attendanceRecords()
      .filter((a) => a.profileId === id)
      .sort((a, b) => a.date.localeCompare(b.date)),
    parties,
    target: (await getTargets()).find((t) => t.profileId === id),
    visits: (await getVisits()).filter((v) => v.profileId === id),
    loans: (await getLoans()).filter((l) => l.profileId === id),
    slips: phase3.salarySlips().filter((s) => s.profileId === id),
  };
}

export async function getAttendanceToday() {
  await live();
  return (await getEmployees()).map((e) => ({ id: e.id, name: e.fullName, role: e.role, record: e.today, month: e.month }));
}

/** Attendance records someone corrected, newest first, with whose record it was. */
export async function getAttendanceCorrections() {
  await live();
  return attendanceRecords()
    .filter((a) => a.correctedBy)
    .map((a) => ({ ...a, name: staffName(a.profileId) }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Every attendance record with whose it is, newest first (the date-filtered list on Attendance). */
export async function getAttendanceRecords() {
  await live();
  return attendanceRecords()
    .map((a) => ({ ...a, name: staffName(a.profileId) }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
}

export async function getVisits() {
  await live();
  return phase3.visits
    .map((v) => ({ ...v, staffName: staffName(v.profileId), partyName: v.partyId ? partyName(v.partyId) : (v.prospect ?? "New party") }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getTargets() {
  await live();
  const month = sample.SAMPLE_TODAY.slice(0, 7);
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  return phase3.targets.map((t) => {
    const mine = new Set(sample.parties.filter((p) => p.assignedTo === t.profileId).map((p) => p.id));
    const bills = sample.sales.filter((s) => mine.has(s.partyId) && s.status === "saved" && s.billDate.startsWith(t.month));
    const collected = sample.receipts.filter((r) => mine.has(r.partyId) && r.date.startsWith(t.month)).reduce((s, r) => s + r.amount, 0);
    return {
      ...t,
      name: staffName(t.profileId),
      salesActual: bills.reduce((s, x) => s + x.total, 0),
      bagsActual: bills.flatMap((s) => s.lines).filter((l) => l.productId.startsWith("p-deccan")).reduce((s, l) => s + l.qty, 0),
      collectionsActual: collected,
      /** Share of the month gone, to judge whether progress is on track. */
      monthElapsed: Number(sample.SAMPLE_TODAY.slice(8, 10)) / daysInMonth,
    };
  });
}

export async function getLoans() {
  await live();
  return phase3.loans.map((l) => ({ ...l, name: staffName(l.profileId), balance: loanBalance(l) }));
}

export async function getSalarySheet(month: string) {
  await live();
  return phase3
    .salarySlips()
    .filter((s) => s.month === month)
    .map((s) => ({ ...s, name: staffName(s.profileId), role: sample.profiles.find((p) => p.id === s.profileId)!.role }));
}

// ── Orders and deliveries ────────────────────────────────────────────────────

/** Orders; a godown's in-charges only get the orders loaded from their godowns. */
export async function getOrders() {
  await live();
  const visible = await visibleGodowns();
  return phase3.orders
    .filter((o) => canSee(visible, o.godownId))
    .map((o) => {
      const bills = o.saleIds.map((id) => sample.sales.find((s) => s.id === id)).filter((s): s is Sale => Boolean(s));
      const dispatchedQty = (productId: string) => bills.flatMap((b) => b.lines).filter((l) => l.productId === productId).reduce((s, l) => s + l.qty, 0);
      return {
        ...o,
        partyName: partyName(o.partyId),
        takenByName: staffName(o.takenBy),
        bills: bills.map((b) => ({ id: b.id, billNo: b.billNo, date: b.billDate, total: b.total })),
        lines: o.lines.map((l) => ({ ...l, dispatched: dispatchedQty(l.productId) })),
      };
    });
}

export async function getOrder(id: string) {
  await live();
  return (await getOrders()).find((o) => o.id === id);
}

export async function getDeliveries() {
  await live();
  return phase3.deliveries.map((d) => {
    const sale = sample.sales.find((s) => s.id === d.saleId)!;
    return {
      ...d,
      billNo: sale.billNo,
      partyName: partyName(sale.partyId),
      destination: sale.destination,
      lines: sale.lines,
      driverName: staffName(d.driverId),
    };
  });
}

// ── Role home screens ────────────────────────────────────────────────────────

/** Sales and collection staff: today's visits, parties to collect from, cash in hand, target progress. */
export async function getFieldHome(profileId: string) {
  await live();
  const today = sample.SAMPLE_TODAY;
  const [visits, ageing, cash, targets, orders] = await Promise.all([getVisits(), getAgeingReport(), getCashSummary(), getTargets(), getOrders()]);
  const myParties = new Set(sample.parties.filter((p) => p.assignedTo === profileId).map((p) => p.id));
  return {
    name: staffName(profileId),
    attendance: attendanceOn(profileId, todayISO()),
    visits: visits.filter((v) => v.profileId === profileId && v.date === today),
    toCollect: ageing.filter((r) => myParties.has(r.id)).sort((a, b) => b.overdue - a.overdue),
    cash: cash.find((c) => c.holder === profileId),
    target: targets.find((t) => t.profileId === profileId),
    orders: orders.filter((o) => o.takenBy === profileId && (o.status === "new" || o.status === "confirmed")),
  };
}

/** Godown in-charge: stock on hand, today's company lorries (already in stock), bills to load and orders waiting. */
export async function getGodownHome() {
  await live();
  const today = sample.SAMPLE_TODAY;
  const [balances, products, godowns, orders, visible] = await Promise.all([getStockBalances(), getProducts(), getMyGodowns(), getOrders(), visibleGodowns()]);
  return {
    // The signed-in in-charge's own day.
    attendance: attendanceOn((await getCurrentUser()).id, todayISO()),
    stock: godowns.map((g) => ({
      ...g,
      items: balances.filter((b) => b.godownId === g.id).map((b) => ({ ...b, product: products.find((p) => p.id === b.productId)! })),
    })),
    lorriesToday: sample.purchases
      .filter((p) => p.receivedDate === today && !p.onLorry && canSee(visible, p.godownId))
      .map((p) => ({ ...p, companyName: partyName(p.companyId), godownName: godowns.find((g) => g.id === p.godownId)?.name })),
    toLoad: sample.sales
      .filter((s) => s.billDate === today && s.status === "saved" && s.source === "godown" && canSee(visible, s.godownId))
      .map((s) => ({
        id: s.id,
        billNo: s.billNo,
        partyName: partyName(s.partyId),
        lines: s.lines,
        godownName: godowns.find((g) => g.id === s.godownId)?.name,
        transportMode: s.transportMode,
      })),
    pendingOrders: orders.filter((o) => o.status === "confirmed" || o.status === "partly_dispatched"),
  };
}

/** Driver: today's deliveries, cash in hand and vehicle renewals. */
export async function getDriverHome(profileId: string) {
  await live();
  const today = sample.SAMPLE_TODAY;
  const [deliveries, cash, policies] = await Promise.all([getDeliveries(), getCashSummary(), getPolicies()]);
  return {
    name: staffName(profileId),
    vehicle: phase3.employees.find((e) => e.profileId === profileId)?.vehicle,
    attendance: attendanceOn(profileId, todayISO()),
    deliveries: deliveries.filter((d) => d.driverId === profileId),
    cash: cash.find((c) => c.holder === profileId),
    renewals: policies.filter((p) => p.kind === "vehicle" && p.daysLeft <= 30),
    fuelToday: phase2.expenses.filter((e) => e.date === today && e.head === "fuel" && e.paidBy === profileId).reduce((s, e) => s + e.amount, 0),
  };
}

// ── Stock movement: transfers, lorry stock, suspense loads ──────────────────

const godownName = (id: string) => sample.godowns.find((g) => g.id === id)?.name ?? id;

export async function getTransfers() {
  await live();
  const visible = await visibleGodowns();
  return phase4.transfers
    .filter((t) => canSee(visible, t.from) || canSee(visible, t.to))
    .map((t) => ({ ...t, fromName: godownName(t.from), toName: godownName(t.to) }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Loads sold straight off a lorry: loaded, sold (bills with that lorry number) and still on the truck. */
/** The sample lorry, from its sample purchase. */
const sampleLorries = (): Lorry[] =>
  sample.purchases
    .filter((p) => p.onLorry)
    .map((p) => ({
      id: p.id,
      companyId: p.companyId,
      companyName: partyName(p.companyId),
      lorryNo: p.lorryNo,
      driverName: p.driverName,
      invoiceNo: p.invoiceNo || undefined,
      invoiceDate: p.invoiceDate,
      invoicePaperKept: Boolean(p.invoicePaperKept),
      unloadingCharges: Boolean(p.unloadingCharges),
      sellOutDays: p.sellOutDays ?? 0,
      lines: p.lines.map(({ productId, qty }) => ({ productId, qty })),
      invoiceValue: p.lines.reduce((s, l) => s + l.qty * l.rate, 0),
      sold: p.soldOut,
      purchaseId: p.id,
    }));

/** Company lorries sold straight off the truck, newest first: the ones entered in the app, then the sample one. Owner only. */
export async function getLorries(): Promise<Lorry[]> {
  await live();
  if ((await getCurrentUser()).role !== "owner") return [];
  return [...localLorries(), ...sampleLorries()].sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
}

/** Purchases › Lorry › New lorry purchase: saves the lorry; selling starts on its invoice date. */
export async function addLorryPurchase(lorry: Omit<Lorry, "id" | "original">): Promise<Lorry> {
  const saved = { ...lorry, id: `lorry-${Date.now().toString(36)}` };
  await saving(() => saveLocalLorry(saved));
  return saved;
}

export async function deleteLorry(id: string): Promise<boolean> {
  return saving(() => removeLocalLorry(id));
}

/** Saves an update to a lorry entered in the app (its sale so far, tick boxes, and whether it is sold out); false when it isn't one. */
export async function updateLorry(id: string, patch: Pick<Lorry, "sale" | "sold" | "invoicePaperKept" | "unloadingCharges">): Promise<boolean> {
  return saving(() => {
    const lorry = localLorries().find((l) => l.id === id);
    if (!lorry) return false;
    saveLocalLorry({ ...lorry, ...patch });
    return true;
  });
}

export async function getSuspenseLoads() {
  await live();
  const visible = await visibleGodowns();
  return phase4.suspenseLoads
    .filter((s) => canSee(visible, s.godownId))
    .map((s) => ({
      ...s,
      godownName: godownName(s.godownId),
      product: sample.products.find((p) => p.id === s.productId)!,
      assignedParty: s.assigned ? partyName(s.assigned.partyId) : undefined,
    }))
    .sort((a, b) => Number(Boolean(a.assigned)) - Number(Boolean(b.assigned)) || b.date.localeCompare(a.date));
}

// ── Fleet ────────────────────────────────────────────────────────────────────

const docLabels = { insurance: "Insurance", tax: "Road tax", pollution: "Pollution (PUC)", fitness: "Fitness", permit: "Permit" } as const;

function vehicleSummary(v: (typeof phase4.vehicles)[number]) {
  const label = phase4.vehicleLabel(v);
  const renewals = (Object.entries(v.documents) as [keyof typeof docLabels, string | undefined][])
    .filter((e): e is [keyof typeof docLabels, string] => Boolean(e[1]))
    .map(([doc, due]) => ({ doc, label: docLabels[doc], due, daysLeft: daysBetween(sample.SAMPLE_TODAY, due) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const month = sample.SAMPLE_TODAY.slice(0, 7);
  const expenses = phase2.expenses.filter((e) => e.tag?.kind === "vehicle" && e.tag.label === label);
  return {
    ...v,
    label,
    driverName: v.driverId ? staffName(v.driverId) : undefined,
    ownerName: v.ownerPartyId ? partyName(v.ownerPartyId) : undefined,
    renewals,
    nextRenewal: renewals[0],
    serviceDueInKm: v.nextServiceKm ? v.nextServiceKm - v.odometer : undefined,
    lastService: phase4.serviceLog.filter((s) => s.vehicleId === v.id).sort((a, b) => b.date.localeCompare(a.date))[0],
    monthCost: expenses.filter((e) => e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0),
    expenses,
  };
}

export async function getVehicles() {
  await live();
  return phase4.vehicles.map(vehicleSummary);
}

export async function getVehicle(id: string) {
  await live();
  const v = phase4.vehicles.find((x) => x.id === id);
  if (!v) return undefined;
  return {
    ...vehicleSummary(v),
    services: phase4.serviceLog.filter((s) => s.vehicleId === id).sort((a, b) => b.date.localeCompare(a.date)),
    trips: (await getTrips()).filter((t) => t.vehicleId === id),
  };
}

export async function getTrips() {
  await live();
  return phase4.trips.map((t) => {
    const vehicle = phase4.vehicles.find((v) => v.id === t.vehicleId)!;
    const label = phase4.vehicleLabel(vehicle);
    const stops = t.saleIds.map((id) => sample.sales.find((s) => s.id === id)!);
    return {
      ...t,
      vehicleLabel: label,
      driverName: staffName(t.driverId),
      stops: stops.map((s) => ({ saleId: s.id, billNo: s.billNo, partyName: partyName(s.partyId), destination: s.destination, lines: s.lines, freight: s.transportCharge })),
      km: t.endKm !== undefined ? t.endKm - t.startKm : undefined,
      freightCharged: stops.reduce((s, x) => s + x.transportCharge, 0),
      fuel: phase2.expenses.filter((e) => e.date === t.date && e.head === "fuel" && e.tag?.label === label).reduce((s, e) => s + e.amount, 0),
    };
  });
}

export async function getFreightRates() {
  return base4.freightRates;
}

/** Own drivers (cash given, spent and returned) and lorry owners we rent from. */
export async function getDrivers() {
  await live();
  const cash = await getCashSummary();
  const own = sample.profiles
    .filter((p) => p.role === "driver")
    .map((p) => {
      const entries = cashEntries(p.id);
      const month = sample.SAMPLE_TODAY.slice(0, 7);
      const inMonth = entries.filter((e) => e.date.startsWith(month));
      return {
        id: p.id,
        name: p.fullName,
        kind: "own" as const,
        vehicle: phase4.vehicles.find((v) => v.driverId === p.id),
        withDriver: cash.find((c) => c.holder === p.id)?.closing ?? 0,
        advances: inMonth.filter((e) => e.kind === "handover_in").reduce((s, e) => s + e.amount, 0),
        spent: -inMonth.filter((e) => e.kind === "expense").reduce((s, e) => s + e.amount, 0),
        returned: -inMonth.filter((e) => e.kind === "handover_out").reduce((s, e) => s + e.amount, 0),
        loanBalance: phase3.loans.filter((l) => l.profileId === p.id).reduce((s, l) => s + loanBalance(l), 0),
        trips: phase4.trips.filter((t) => t.driverId === p.id).length,
        entries,
      };
    });
  const parties = await getParties();
  const rented = phase4.vehicles
    .filter((v) => v.category === "rented" && v.ownerPartyId)
    .map((v) => ({ id: v.ownerPartyId!, name: partyName(v.ownerPartyId!), kind: "rented" as const, vehicle: v, balance: parties.find((p) => p.id === v.ownerPartyId)?.balance ?? 0 }));
  return { own, rented };
}

/** Vehicles with a GPS position, today's route for the lorry, and the places on the freight chart. */
export async function getFleetMap() {
  await live();
  return {
    vehicles: (await getVehicles()).filter((v) => v.gps),
    route: phase4.routeToday,
    places: phase4.freightRates.map((f) => ({ name: f.place, lat: f.lat, lng: f.lng })),
  };
}

// ── Reminder messages ────────────────────────────────────────────────────────

/** Templates, rules and a few real overdue parties to preview the messages with. */
export async function getReminderSetup() {
  await live();
  const ageing = await getAgeingReport();
  const previews = ageing
    .filter((r) => r.overdue > 0)
    .slice(0, 6)
    .map((r) => {
      const bill = sample.sales
        .filter((s) => s.partyId === r.id && s.status === "saved" && daysBetween(s.billDate, sample.SAMPLE_TODAY) > 7)
        .sort((a, b) => a.billDate.localeCompare(b.billDate))
        .at(-1);
      return {
        partyId: r.id,
        party: r.name,
        amount: r.overdue,
        balance: r.unpaid,
        days: bill ? daysBetween(bill.billDate, sample.SAMPLE_TODAY) : 8,
        billNo: bill ? String(bill.billNo) : "",
        billDate: bill?.billDate ?? "",
        staff: r.staff ?? "Our staff",
      };
    });
  return { templates: [...phase5.reminderTemplates], rules: { ...phase5.reminderRules }, previews, firm: await getFirm() };
}

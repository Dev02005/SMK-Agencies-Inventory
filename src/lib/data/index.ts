/**
 * Data access for every screen. Today each function reads the sample data; in the Supabase step each body
 * becomes a query (or a call to a database view), and the screens stay unchanged.
 */
import "server-only";
import { connection } from "next/server";
import { todayISO } from "@/lib/format";
import { checkCredit, toMT } from "@/lib/sales";
import * as base from "./sample";
import * as base2 from "./sample-phase2";
import * as base3 from "./sample-phase3";
import * as base4 from "./sample-phase4";
import * as phase5 from "./sample-phase5";
import type { Ageing, BankEntry, CashHolder, LedgerEntry, Party, Profile, Sale } from "./types";

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

/**
 * Today's date in India (YYYY-MM-DD), with the sample records brought up to it; they are rebuilt when the date
 * changes. Every reader of dated records awaits this first. It waits for the request (connection), so a date is
 * never frozen into a page at build time. With Supabase, the queries take its place.
 */
async function live() {
  await connection();
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

/** The day the books were opened (opening balances and stock), for "all time" reports. */
export async function getOpeningDate() {
  await live();
  return sample.OPENING_DATE;
}

export type PartyWithBalance = Party & {
  /** Positive = they owe us (Dr); negative = we owe them (Cr). */
  balance: number;
  overdue30: number;
};
export type SaleWithParty = Sale & { partyName: string };

// ── Masters ──────────────────────────────────────────────────────────────────

export async function getFirm() {
  return base.firm;
}

/** The signed-in user. The sample login (lib/session) is the owner's. */
export async function getCurrentUser(): Promise<Profile> {
  return base.profiles[0];
}

export async function getProfiles() {
  return base.profiles;
}

export async function getProfile(id: string | undefined) {
  return base.profiles.find((p) => p.id === id);
}

export async function getGodowns() {
  return base.godowns;
}

export async function getProducts() {
  return base.products;
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

export async function getSales(): Promise<SaleWithParty[]> {
  await live();
  return sample.sales
    .map((s) => ({ ...s, partyName: partyName(s.partyId) }))
    .sort((a, b) => newestFirst(a, b) || b.billNo - a.billNo);
}

export async function getSale(id: string): Promise<SaleWithParty | undefined> {
  await live();
  const sale = sample.sales.find((s) => s.id === id);
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
  return sample.purchases
    .map((p) => ({ ...p, companyName: partyName(p.companyId) }))
    .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
}

export async function getPurchase(id: string) {
  await live();
  const purchase = sample.purchases.find((p) => p.id === id);
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
  const totals = new Map<string, { godownId: string; productId: string; qty: number }>();
  for (const m of sample.stockMovements) {
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
  return [...sample.stockMovements];
}

export async function getStockMovements() {
  await live();
  return [...sample.stockMovements].filter((m) => m.kind !== "opening").sort((a, b) => b.date.localeCompare(a.date));
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
      title: `${party.name} · Bill ${s.billNo}`,
      detail: credit?.overLimit ? `Over credit limit by ₹${credit.over.toLocaleString("en-IN")}` : "Waiting for owner approval",
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
    ...(await getRentals()).filter((r) => r.status === "overdue").map((r) => ({ id: r.id, title: `Rent from ${r.counterparty}`, when: "overdue", href: "/personal/rents" })),
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
    const supplies: { saleId: string; billNo: number; date: string; bags: number; amount: number }[] = [];
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

export async function getChits() {
  await live();
  return phase2.chits.map((c) => {
    const nextDue = c.paidMonths < c.months ? monthOffset(c.startDate, c.paidMonths, c.dueDay) : undefined;
    return {
      ...c,
      paid: c.paidMonths * c.instalment,
      remainingMonths: c.months - c.paidMonths,
      nextDue,
      daysToDue: nextDue ? daysBetween(sample.SAMPLE_TODAY, nextDue) : -1,
    };
  });
}

export async function getRentals() {
  await live();
  const thisMonth = sample.SAMPLE_TODAY.slice(0, 7);
  const today = Number(sample.SAMPLE_TODAY.slice(8, 10));
  return phase2.rentals.map((r) => {
    const status =
      r.paidThrough >= thisMonth ? ("paid" as const) : today > r.dueDay ? ("overdue" as const) : ("due" as const);
    const [py, pm] = r.paidThrough.split("-").map(Number);
    const [ty, tm] = thisMonth.split("-").map(Number);
    const monthsDue = Math.max(0, ty * 12 + tm - (py * 12 + pm));
    return { ...r, status, amountDue: monthsDue * r.monthlyRent };
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

function attendanceSummary(profileId: string) {
  const month = phase3.attendance.filter((a) => a.profileId === profileId && a.date.startsWith(sample.SAMPLE_TODAY.slice(0, 7)));
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

export async function getEmployees() {
  await live();
  return phase3.employees.map((e) => {
    const profile = sample.profiles.find((p) => p.id === e.profileId)!;
    return {
      ...profile,
      ...e,
      today: phase3.attendance.find((a) => a.profileId === e.profileId && a.date === sample.SAMPLE_TODAY),
      partiesCount: sample.parties.filter((p) => p.assignedTo === e.profileId).length,
      loanBalance: phase3.loans.filter((l) => l.profileId === e.profileId).reduce((s, l) => s + loanBalance(l), 0),
      month: attendanceSummary(e.profileId),
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
    attendance: phase3.attendance.filter((a) => a.profileId === id).sort((a, b) => a.date.localeCompare(b.date)),
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
  return phase3.attendance
    .filter((a) => a.correctedBy)
    .map((a) => ({ ...a, name: staffName(a.profileId) }))
    .sort((a, b) => b.date.localeCompare(a.date));
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

export async function getOrders() {
  await live();
  return phase3.orders.map((o) => {
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
    attendance: phase3.attendance.find((a) => a.profileId === profileId && a.date === today),
    visits: visits.filter((v) => v.profileId === profileId && v.date === today),
    toCollect: ageing.filter((r) => myParties.has(r.id)).sort((a, b) => b.overdue - a.overdue),
    cash: cash.find((c) => c.holder === profileId),
    target: targets.find((t) => t.profileId === profileId),
    orders: orders.filter((o) => o.takenBy === profileId && (o.status === "new" || o.status === "confirmed")),
  };
}

/** Godown in-charge: stock on hand, lorries arriving today, bills to load and orders waiting. */
export async function getGodownHome() {
  await live();
  const today = sample.SAMPLE_TODAY;
  const [balances, products, godowns, orders] = await Promise.all([getStockBalances(), getProducts(), getGodowns(), getOrders()]);
  return {
    attendance: phase3.attendance.find((a) => a.profileId === sample.profiles.find((p) => p.role === "godown")?.id && a.date === today),
    stock: godowns.map((g) => ({
      ...g,
      items: balances.filter((b) => b.godownId === g.id).map((b) => ({ ...b, product: products.find((p) => p.id === b.productId)! })),
    })),
    arriving: sample.purchases
      .filter((p) => p.receivedDate === today)
      .map((p) => ({ ...p, companyName: partyName(p.companyId), godownName: godowns.find((g) => g.id === p.godownId)?.name })),
    toLoad: sample.sales
      .filter((s) => s.billDate === today && s.status === "saved" && s.source === "godown")
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
    attendance: phase3.attendance.find((a) => a.profileId === profileId && a.date === today),
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
  return [...phase4.transfers]
    .map((t) => ({ ...t, fromName: godownName(t.from), toName: godownName(t.to) }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Loads sold straight off a lorry: loaded, sold (bills with that lorry number) and still on the truck. */
export async function getLorryLoads() {
  await live();
  return sample.purchases
    .filter((p) => p.onLorry)
    .map((p) => {
      const bills = sample.sales.filter((s) => s.source === "lorry" && s.vehicleNo === p.lorryNo && s.status === "saved" && s.billDate >= p.receivedDate);
      const lines = p.lines.map((l) => {
        const sold = bills.flatMap((b) => b.lines).filter((x) => x.productId === l.productId).reduce((s, x) => s + x.qty, 0);
        return { productId: l.productId, loaded: l.qty, sold, left: l.qty - sold };
      });
      return {
        id: p.id,
        lorryNo: p.lorryNo,
        companyName: partyName(p.companyId),
        arrivedOn: p.receivedDate,
        purchaseId: p.id,
        lines,
        bills: bills.map((b) => ({ id: b.id, billNo: b.billNo, date: b.billDate, partyName: partyName(b.partyId), qty: b.lines.reduce((s, l) => s + l.qty, 0), total: b.total })),
        status: lines.every((l) => l.left <= 0) ? ("closed" as const) : ("selling" as const),
      };
    });
}

export async function getSuspenseLoads() {
  await live();
  return phase4.suspenseLoads
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
  return { templates: [...phase5.reminderTemplates], rules: { ...phase5.reminderRules }, previews, firm: sample.firm };
}

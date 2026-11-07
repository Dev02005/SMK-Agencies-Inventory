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
import { addLocalCustomer, addLocalDestination, addLocalNote, addLocalRentDriver, adminDesignations, clearStandardProducts, loadLocal, localRentDrivers, removeLocalChit, removeLocalDestination, removeLocalGodown, removeLocalLorry, removeLocalParty, removeLocalProduct, removeLocalRentDriver, removeLocalRental, localChits, localDestinations, localRentals, saveLocalChit, saveLocalGodown, saveLocalRental, localLorries, isLocalStaff, notesOf, ownerDesignation, profilePhoto, removeLocalNote, saveLocalDriverVehicle, saveLocalLorry, saveLocalProduct, saveLocalProfileEdit, saveLocalStaffFields, saveLocalVehicle, type VehicleChange, addLocalPersonalBank, localPurchases, saveLocalPurchase, localSales, saveLocalSale, localStockMovements, saveLocalStockMovements, updateLocalStockMovements, localOrders, saveLocalOrder, localQuotations, saveLocalQuotation, localExpenses, saveLocalExpense, localReceipts, saveLocalReceipt, localPayments, saveLocalPayment } from "./local-data";
import { loadFleet } from "./sample-fleet";
import * as phase5 from "./sample-phase5";
import { saving, syncRecords, whenRecordsChange } from "./store";
import type { Ageing, BankEntry, CashHolder, Chit, Expense, Godown, LedgerEntry, Lorry, Order, OrderStatus, Party, Payment, Product, Profile, Purchase, Quotation, Receipt, Rental, Sale, SaleLine, SaleStatus, StockMovement, StockSource, TransportMode } from "./types";

export type * from "./types";

/** The fixed records (firm, products, people, banks, vehicles' chart) plus the dated ones built for `today`. */
function buildBooks(today: string) {
  const book = withoutSampleParties(base.buildSample(today));
  const [dated2, dated3, dated4] = [base2.buildPhase2(book), base3.buildPhase3(book), base4.buildPhase4(book)].map(ofShownParties) as [
    ReturnType<typeof base2.buildPhase2>,
    ReturnType<typeof base3.buildPhase3>,
    ReturnType<typeof base4.buildPhase4>,
  ];
  // Deliveries only for bills still in the book.
  const billed = new Set(book.sales.map((s) => s.id));
  dated3.deliveries = dated3.deliveries.filter((d) => billed.has(d.saleId));
  return {
    sample: { ...base, ...book },
    phase2: { ...base2, ...dated2 },
    phase3: { ...base3, ...dated3 },
    phase4: { ...base4, ...dated4 },
  };
}

/** Whether a sample record belongs to a party the screens show (or to no party at all). */
const shownParty = (shown: Set<string>, x: unknown) => {
  const r = x as { partyId?: unknown; assigned?: { partyId?: unknown } } | null;
  if (r && typeof r === "object") {
    if (typeof r.partyId === "string" && !shown.has(r.partyId)) return false;
    if (r.assigned && typeof r.assigned.partyId === "string" && !shown.has(r.assigned.partyId)) return false;
  }
  return true;
};

/**
 * The sample book without the sample customers' records: their bills (and the stock those bills moved), receipts,
 * advances, payments and quotations. Cash bills and the firm's own parties' records stay.
 */
function withoutSampleParties(book: ReturnType<typeof base.buildSample>) {
  const shown = new Set(base.parties.map((p) => p.id));
  const names = new Set(base.parties.map((p) => p.name.toLowerCase()));
  // The last week's bills of sample customers stay as demo bills, to try the sales screens with: billed to Cash
  // customer (with the sample buyer's name in the remarks), never in any party's ledger. Older ones go.
  const weekAgo = base.addDays(book.SAMPLE_TODAY, -6);
  const bookName = (id: string) => base.bookParties.find((p) => p.id === id)?.name ?? "Walk-in buyer";
  const sales = book.sales.flatMap((s) => {
    if (shownParty(shown, s)) return [s];
    if (s.billDate < weekAgo) return [];
    return [{ ...s, partyId: "cash", demo: true, remarks: [`Sample bill · ${bookName(s.partyId)}`, s.remarks].filter(Boolean).join(" · ") }];
  });
  const dropped = new Set(book.sales.filter((s) => !sales.includes(s)).map((s) => s.billNo).filter((n) => n !== undefined).map(String));
  const fromDroppedBill = (ref: string) => {
    const m = /^Bill (\d+)( cancelled)?$/.exec(ref);
    return Boolean(m && dropped.has(m[1]));
  };
  return {
    ...book,
    sales,
    stockMovements: book.stockMovements.filter((m) => !(m.kind === "sale" && fromDroppedBill(m.ref))),
    receipts: book.receipts.filter((r) => shownParty(shown, r)),
    commitments: book.commitments.filter((c) => shownParty(shown, c)),
    payments: book.payments.filter((p) => shownParty(shown, p)),
    quotations: book.quotations.filter((q) => names.has(q.clientName.toLowerCase())),
  };
}

/** A later sample phase with every list's records of sample parties left out. */
function ofShownParties<T extends object>(dated: T): T {
  const shown = new Set(base.parties.map((p) => p.id));
  return Object.fromEntries(Object.entries(dated).map(([k, v]) => [k, Array.isArray(v) ? v.filter((x) => shownParty(shown, x)) : v])) as T;
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

/**
 * Changes the signed-in person's own name and/or photo (Settings › Account). The lists built from the people are built
 * again, so every screen shows the change.
 */
export async function updateMyProfile(change: { name?: string; photo?: string | null }): Promise<Profile> {
  const { userId } = await requireSession();
  return saving(() => {
    saveLocalProfileEdit(userId, change);
    base.loadMasters();
    builtFor = "";
    return base.profiles.find((p) => p.id === userId) ?? base.profiles[0];
  });
}

/** A person's photo (a JPEG data URL), for /profile-photo/{id}. */
export async function getProfilePhoto(id: string): Promise<string | undefined> {
  await live();
  return profilePhoto(id);
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

/** Settings › Godowns: saves a godown (new or edited), with in-charges and linked products. */
export async function saveGodown(godown: Godown): Promise<Godown> {
  return saving(() => {
    return saveLocalGodown(base.godowns, godown);
  });
}

/** Settings › Godowns: deletes a godown. Returns an error message if it cannot be deleted. */
export async function deleteGodown(id: string): Promise<string | null> {
  return saving(() => {
    const usedInPurchases = [...localPurchases(), ...sample.purchases].some((p) => p.godownId === id);
    const usedInSales = [...localSales(), ...sample.sales].some((s) => s.godownId === id);
    if (usedInPurchases || usedInSales) {
      return "This godown has recorded purchases or sales, so it cannot be deleted.";
    }
    removeLocalGodown(base.godowns, id);
    return null;
  });
}

/** What products can be stored and billed from a godown. */
export async function getProductsForGodown(godownId: string): Promise<Product[]> {
  await live();
  const godown = base.godowns.find((g) => g.id === godownId);
  if (!godown) return base.products;
  if (godown.linkAllProducts) return base.products;
  if (godown.productIds && godown.productIds.length > 0) {
    const set = new Set(godown.productIds);
    const matched = base.products.filter((p) => set.has(p.id));
    if (matched.length > 0) return matched;
  }
  if (godown.own) return base.products;
  // Fallback for company godowns without explicit settings: match brand in godown name
  const nameLower = godown.name.toLowerCase();
  const matched = base.products.filter((p) => nameLower.includes(p.brand.toLowerCase()));
  return matched.length > 0 ? matched : base.products;
}

export async function getProducts() {
  await live();
  return base.products;
}

/** Settings › Products: deletes a product; a reason when it can't be (e.g. one on a saved lorry). */
export async function deleteProduct(id: string): Promise<string | null> {
  return saving(() => {
    if (localLorries().some((l) => l.lines.some((x) => x.productId === id))) return "A saved lorry has this product, so it can't be deleted.";
    removeLocalProduct(base.products, id);
    return null;
  });
}

/** Settings › Products: clears all standard/sample products from the catalog. */
export async function clearAllStandardProducts(): Promise<void> {
  return saving(() => {
    clearStandardProducts(base.products);
  });
}

/** Settings › Products: adds a product (a company's cement type, a steel item, or a custom product). It has no rate; the owner prices each bill. */
export async function addProduct(input: { brand: string; variant: string; category: string; unit?: string; image?: string }): Promise<Product> {
  const slug = `${input.brand}-${input.variant}`.toLowerCase().replace(/\+/g, "-plus").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return saving(() => {
    let id = `p-${slug}`;
    for (let n = 2; base.products.some((p) => p.id === id); n++) id = `p-${slug}-${n}`;
    const category = input.category.trim().toLowerCase();
    const defaultUnit = category === "cement" ? "bag" : category === "steel" ? "kg" : "unit";
    const unit = (input.unit?.trim().toLowerCase() || defaultUnit) as Product["unit"];
    const product: Product = {
      id,
      name: `${input.brand} ${input.variant}`.trim(),
      brand: input.brand.trim(),
      variant: input.variant.trim(),
      category: input.category.trim(),
      unit,
      active: true,
      image: typeof input.image === "string" && input.image.trim() ? input.image : undefined,
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
  [...localSales(), ...sample.sales]
    .filter((s) => s.partyId === partyId && s.status === "saved" && !s.demo)
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

  // Lorry sales to this party
  localLorries().forEach((l) => {
    (l.sale?.bills ?? []).forEach((b) => {
      const isThisParty = b.partyId === partyId || (Boolean(b.soldTo) && b.soldTo?.trim().toLowerCase() === party.name.trim().toLowerCase());
      if (isThisParty && b.amount > 0) {
        rows.push({
          date: b.date ?? l.invoiceDate,
          kind: "sale",
          ref: `Bill ${b.billNo} (Lorry ${l.lorryNo})`,
          href: `/sales/lorries/${l.id}`,
          narration: b.lines
            .map((bl) => {
              const p = sample.products.find((prod) => prod.id === bl.productId);
              return `${bl.qty} ${p?.name ?? "bags"}`;
            })
            .join(", ") + ` · off lorry ${l.lorryNo}`,
          debit: b.amount,
          credit: 0,
        });
      }
    });
  });
  [...localReceipts(), ...sample.receipts]
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
  [...localPurchases(), ...sample.purchases]
    .filter((p) => p.companyId === partyId && !p.demo)
    .forEach((p) =>
      rows.push({
        date: p.invoiceDate,
        kind: "purchase",
        ref: `Purchase Receipt #${p.purchaseNo}`,
        href: `/purchases/${p.id}`,
        narration: `Company Invoice ${p.invoiceNo} · lorry ${p.lorryNo}`,
        debit: 0,
        credit: p.total,
      }),
    );
  [...localPayments(), ...sample.payments]
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
/**
 * The next number in the one bill series that godown and lorry bills share (1, 2, 3…: bills 1 and 2 from a godown,
 * bill 3 from a lorry). Only bills actually saved count, so the sample bills never push it on; it starts at 1.
 * Godown sales join it once they are saved for real (today New sale only shows a sample message).
 */
export async function getNextBillNo(): Promise<number> {
  await live();
  return nextBillNumberNow();
}

/** The latest saved bill number plus one, read straight from the records (for numbering bills as they are saved). */
function nextBillNumberNow(): number {
  const lorry = localLorries()
    .flatMap((l) => l.sale?.bills ?? [])
    .reduce((max, b) => (/^\d+$/.test(b.billNo) ? Math.max(max, Number(b.billNo)) : max), 0);
  const salesMax = localSales().reduce((max, s) => (s.billNo ? Math.max(max, s.billNo) : max), 0);
  return Math.max(lorry, salesMax) + 1;
}

/**
 * Saves a lorry's sale with its bills numbered: a bill already saved keeps its number, each new one (no number yet)
 * takes the next in the series, in order. Numbered inside saving(), so two bills saved at once never share a number.
 */
export async function updateLorryBills(
  id: string,
  patch: Pick<Lorry, "sale" | "sold" | "invoicePaperKept" | "unloadingCharges">,
): Promise<{ saved: boolean; numbers: string[] }> {
  const fresh = patch.sale?.bills?.filter((b) => !b.billNo).length ?? 0;
  if (!fresh) return { saved: await updateLorry(id, patch), numbers: [] };
  return saving(() => {
    const lorry = localLorries().find((l) => l.id === id);
    if (!lorry) return { saved: false, numbers: [] };
    let next = nextBillNumberNow();
    const numbers: string[] = [];
    const bills = (patch.sale?.bills ?? []).map((b) => {
      if (b.billNo) return b;
      const billNo = String(next++);
      numbers.push(billNo);
      return { ...b, billNo };
    });
    const sale = patch.sale && { ...patch.sale, bills, invoiceNo: bills.map((b) => b.billNo).join(", ") || undefined };
    saveLocalLorry({ ...lorry, ...patch, sale });
    return { saved: true, numbers };
  });
}

export type AddSaleInput = {
  firmId?: string;
  billNo?: number;
  partyId: string;
  billDate: string;
  receivedDate?: string;
  source: StockSource;
  godownId?: string;
  vehicleNo?: string;
  transportMode: TransportMode;
  transportCharge: number;
  unloadingCharge: number;
  otherCharge: number;
  discountAmount: number;
  subtotal: number;
  total: number;
  destination?: string;
  remarks?: string;
  status: SaleStatus;
  lines: SaleLine[];
};

export type ApproveSaleInput = {
  saleId: string;
  billNo: number;
  rates: { productId: string; rate: number }[];
  discountAmount?: number;
  vehicleCosts?: { name: string; amount: number }[];
};

export async function addSale(input: AddSaleInput): Promise<Sale> {
  const user = await getCurrentUser();
  return saving(() => {
    let billNo = input.billNo;
    if (input.status === "saved" && !billNo) {
      billNo = nextBillNumberNow();
    }
    const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const sale: Sale = {
      ...input,
      id,
      billNo: input.status === "saved" ? (billNo ?? nextBillNumberNow()) : undefined,
      createdBy: user?.id ?? "u-office",
    };

    saveLocalSale(sale);

    // If billed from a godown, deduct inventory via stock movement
    if (sale.godownId && sale.lines?.length) {
      const movements: StockMovement[] = sale.lines.map((l, i) => ({
        id: `sm-sale-${Date.now()}-${i}`,
        date: sale.receivedDate || sale.billDate,
        godownId: sale.godownId!,
        productId: l.productId,
        qty: -Math.abs(l.qty),
        kind: "sale",
        ref: sale.billNo ? `Sale Bill #${sale.billNo}` : `Sale Request (${partyName(sale.partyId) || "Customer"})`,
      }));
      saveLocalStockMovements(movements);
    }

    return sale;
  });
}

export async function approveSale(input: ApproveSaleInput): Promise<Sale> {
  return saving(() => {
    const all = localSales();
    const sale = all.find((s) => s.id === input.saleId);
    if (!sale) throw new Error("Sale not found");

    const rateMap = new Map(input.rates.map((r) => [r.productId, r.rate]));
    const updatedLines = sale.lines.map((l) => ({
      ...l,
      rate: rateMap.get(l.productId) ?? l.rate ?? 0,
    }));

    const subtotal = updatedLines.reduce((acc, l) => acc + l.qty * l.rate, 0);
    const discountAmount = input.discountAmount ?? sale.discountAmount ?? 0;
    const total = Math.max(0, subtotal - discountAmount + (sale.transportCharge ?? 0) + (sale.otherCharge ?? 0));

    const updatedSale: Sale = {
      ...sale,
      billNo: input.billNo,
      lines: updatedLines,
      subtotal,
      discountAmount,
      total,
      status: "saved",
    };

    saveLocalSale(updatedSale);

    // Update stock movement ref to reference the approved bill
    updateLocalStockMovements((movements) => {
      for (const m of movements) {
        if (m.kind === "sale" && m.ref?.includes("Sale Request") && m.godownId === sale.godownId) {
          m.ref = `Sale Bill #${input.billNo}`;
        }
      }
    });

    return updatedSale;
  });
}

export async function rejectSale(saleId: string, reason?: string): Promise<Sale> {
  return saving(() => {
    const all = [...localSales(), ...sample.sales];
    const sale = all.find((s) => s.id === saleId);
    if (!sale) throw new Error("Sale not found");

    const updatedSale: Sale = {
      ...sale,
      status: "cancelled",
      overrideReason: reason || "Rejected by owner",
    };

    saveLocalSale(updatedSale);

    // Restore stock if cancelled
    if (sale.godownId && sale.lines?.length) {
      const movements: StockMovement[] = sale.lines.map((l, i) => ({
        id: `sm-cancel-${Date.now()}-${i}`,
        date: todayISO(),
        godownId: sale.godownId!,
        productId: l.productId,
        qty: Math.abs(l.qty),
        kind: "transfer",
        ref: `Cancelled Sale Request`,
      }));
      saveLocalStockMovements(movements);
    }

    return updatedSale;
  });
}

export async function getSales(): Promise<SaleWithParty[]> {
  await live();
  const visible = await visibleGodowns();
  const combined = [...localSales(), ...sample.sales];
  return combined
    .filter((s) => canSee(visible, s.godownId))
    .map((s) => ({ ...s, partyName: partyName(s.partyId) }))
    .sort((a, b) => newestFirst(a, b) || billOrder(b) - billOrder(a));
}

export async function getSale(id: string): Promise<SaleWithParty | undefined> {
  await live();
  const visible = await visibleGodowns();
  const combined = [...localSales(), ...sample.sales];
  const sale = combined.find((s) => s.id === id && canSee(visible, s.godownId));
  return sale && { ...sale, partyName: partyName(sale.partyId) };
}

export async function getQuotations(): Promise<Quotation[]> {
  await live();
  const combined = [...localQuotations(), ...sample.quotations];
  return combined.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getQuotation(id: string): Promise<Quotation | undefined> {
  await live();
  const combined = [...localQuotations(), ...sample.quotations];
  return combined.find((q) => q.id === id);
}

export async function addQuotation(input: Omit<Quotation, "id">): Promise<Quotation> {
  return saving(() => {
    const id = `q-${Date.now()}`;
    const quotation: Quotation = { ...input, id };
    saveLocalQuotation(quotation);
    return quotation;
  });
}

/** Standard terms printed on every new quotation; editable per quotation. */
export async function getQuotationTerms() {
  return base.defaultTerms();
}

export type AddPurchaseInput = {
  firmId?: string;
  companyId: string;
  invoiceNo: string;
  invoiceDate: string;
  receivedDate: string;
  lorryNo: string;
  driverMobile?: string;
  godownId: string;
  onLorry?: boolean;
  lines: { productId: string; qty: number; rate?: number }[];
  total: number;
};

export async function addPurchase(input: AddPurchaseInput): Promise<Purchase> {
  return saving(() => {
    const all = [...localPurchases(), ...sample.purchases];
    const maxNo = all.reduce((max, p) => Math.max(max, p.purchaseNo || 0), 0);
    const purchaseNo = maxNo + 1;
    const id = `pur-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const totalQty = input.lines.reduce((s, l) => s + (l.qty || 0), 0);
    const avgRate = totalQty > 0 ? Math.round(input.total / totalQty) : 0;
    const lines = input.lines.map((l) => ({
      productId: l.productId,
      qty: l.qty,
      rate: l.rate ?? avgRate,
    }));

    const purchase: Purchase = {
      id,
      firmId: input.firmId,
      purchaseNo,
      companyId: input.companyId,
      invoiceNo: input.invoiceNo,
      invoiceDate: input.invoiceDate,
      receivedDate: input.receivedDate,
      lorryNo: input.lorryNo,
      driverMobile: input.driverMobile,
      godownId: input.godownId,
      onLorry: input.onLorry,
      lines,
      total: input.total,
    };

    saveLocalPurchase(purchase);

    if (input.godownId && !input.onLorry) {
      const movements: StockMovement[] = lines.map((l, i) => ({
        id: `sm-pur-${Date.now()}-${i}`,
        date: input.receivedDate || input.invoiceDate,
        godownId: input.godownId,
        productId: l.productId,
        qty: Math.abs(l.qty),
        kind: "inward",
        ref: `Purchase Receipt #${purchaseNo} (${input.invoiceNo})`,
      }));
      saveLocalStockMovements(movements);
    }

    return purchase;
  });
}

/** The next purchase receipt number in our internal inward sequence (independent from sales bills). */
export async function getNextPurchaseReceiptNo(): Promise<number> {
  await live();
  const all = [...localPurchases(), ...sample.purchases];
  const maxNo = all.reduce((max, p) => Math.max(max, p.purchaseNo || 0), 0);
  return maxNo + 1;
}

export async function getPurchases() {
  await live();
  const visible = await visibleGodowns();
  const combined = [...localPurchases(), ...sample.purchases];
  return combined
    .filter((p) => canSee(visible, p.godownId))
    .map((p) => ({ ...p, companyName: partyName(p.companyId) }))
    .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
}

export async function getPurchase(id: string) {
  await live();
  const visible = await visibleGodowns();
  const combined = [...localPurchases(), ...sample.purchases];
  const purchase = combined.find((p) => p.id === id && canSee(visible, p.godownId));
  return purchase && { ...purchase, companyName: partyName(purchase.companyId) };
}

export async function getReceipts(): Promise<(Receipt & { partyName: string })[]> {
  await live();
  const all = [...localReceipts(), ...sample.receipts];
  return all
    .map((r) => ({ ...r, partyName: partyName(r.partyId) }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.receiptNo - a.receiptNo);
}

export async function addReceipt(input: Omit<Receipt, "id" | "receiptNo">): Promise<Receipt> {
  return saving(() => {
    const existing = [...localReceipts(), ...sample.receipts];
    const receiptNo = existing.reduce((max, r) => Math.max(max, r.receiptNo), 0) + 1;
    const id = `rec-${Date.now()}`;
    const receipt: Receipt = { ...input, id, receiptNo };
    saveLocalReceipt(receipt);
    return receipt;
  });
}

export async function getPayments(): Promise<(Payment & { partyName: string })[]> {
  await live();
  const all = [...localPayments(), ...sample.payments];
  return all
    .map((p) => ({ ...p, partyName: partyName(p.partyId) }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.paymentNo - a.paymentNo);
}

export async function addPayment(input: Omit<Payment, "id" | "paymentNo">): Promise<Payment> {
  return saving(() => {
    const existing = [...localPayments(), ...sample.payments];
    const paymentNo = existing.reduce((max, p) => Math.max(max, p.paymentNo), 0) + 1;
    const id = `pay-${Date.now()}`;
    const payment: Payment = { ...input, id, paymentNo };
    saveLocalPayment(payment);
    return payment;
  });
}

// ── Stock ────────────────────────────────────────────────────────────────────

export async function getStockBalances() {
  await live();
  const visible = await visibleGodowns();
  const totals = new Map<string, { godownId: string; productId: string; qty: number }>();
  const movements = [...sample.stockMovements, ...localStockMovements()];
  for (const m of movements.filter((x) => canSee(visible, x.godownId))) {
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
  const movements = [...sample.stockMovements, ...localStockMovements()];
  return movements.filter((m) => canSee(visible, m.godownId));
}

export async function getStockMovements() {
  await live();
  const visible = await visibleGodowns();
  const movements = [...sample.stockMovements, ...localStockMovements()];
  return movements.filter((m) => m.kind !== "opening" && canSee(visible, m.godownId)).sort((a, b) => b.date.localeCompare(a.date));
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboard() {
  await live();
  const today = sample.SAMPLE_TODAY;
  const allSales = [...localSales(), ...sample.sales];
  const todays = allSales.filter((s) => s.billDate === today && s.status === "saved");
  const lineQty = (category: "cement" | "steel") =>
    todays
      .flatMap((s) => s.lines)
      .filter((l) => sample.products.find((p) => p.id === l.productId)?.category === category)
      .reduce((sum, l) => sum + l.qty, 0);

  const parties = await getParties();
  const customers = parties.filter((p) => p.kind !== "company" && p.kind !== "lorry_owner");

  const pending = allSales.filter((s) => s.status === "pending_approval");
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

export async function getExpenses(): Promise<(Expense & { paidFromLabel: string })[]> {
  await live();
  const all = [...localExpenses(), ...phase2.expenses];
  return all
    .map((e) => ({
      ...e,
      paidFromLabel: e.paidFrom === "cash" ? `Cash · ${holderName(e.paidBy ?? phase2.OFFICE)}` : holderName(`bank:${e.paidFrom}`),
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.expenseNo - a.expenseNo);
}

export async function addExpense(input: Omit<Expense, "id" | "expenseNo">): Promise<Expense> {
  return saving(() => {
    const existing = [...localExpenses(), ...phase2.expenses];
    const expenseNo = existing.reduce((max, e) => Math.max(max, e.expenseNo), 0) + 1;
    const id = `exp-${Date.now()}`;
    const expense: Expense = { ...input, id, expenseNo };
    saveLocalExpense(expense);
    return expense;
  });
}

// ── Advances and cement commitments ─────────────────────────────────────────

export async function getCommitments() {
  await live();
  return sample.commitments.map((c) => {
    const partySales = [...localSales(), ...sample.sales]
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

/** Adds one of the owner's personal bank accounts (Personal › Banks › Add bank), saved in the records. */
export async function addPersonalBankAccount(account: { bank: string; name: string; accountNo: string; ifsc?: string; branch?: string; openingBalance: number }) {
  return saving(() => {
    const saved = addLocalPersonalBank(account);
    base2.loadPhase2();
    builtFor = "";
    return saved;
  });
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

// ── People: employees, tours, targets, salary ───────────────────────────────

const staffName = (id: string | undefined) => sample.profiles.find((p) => p.id === id)?.fullName ?? "Office";

function loanBalance(loan: (typeof phase3.loans)[number]) {
  return loan.amount - loan.repayments.reduce((s, r) => s + r.amount, 0);
}

/** Each person's designation ("Wholesale manager", "Owner"…), so any page can show it. */
export async function getDesignations(): Promise<Record<string, string>> {
  await live();
  return designationsNow();
}

function designationsNow(): Record<string, string> {
  const owner = base.profiles.find((p) => p.role === "owner");
  return {
    ...(owner ? { [owner.id]: ownerDesignation ?? "Owner" } : {}),
    ...adminDesignations(),
    ...Object.fromEntries(base3.employees.map((e) => [e.profileId, e.designation])),
  };
}

/** Everyone who can sign in, with their designation, from one fetch of the records (the sign-in screen). Drivers don't sign in. */
export async function getSignInPeople(): Promise<(Profile & { designation: string })[]> {
  await live();
  const designations = designationsNow();
  return base.profiles.filter((p) => p.active && p.role !== "driver").map((p) => ({ ...p, designation: designations[p.id] ?? "" }));
}

export async function getEmployees() {
  await live();
  return phase3.employees.map((e) => {
    const profile = sample.profiles.find((p) => p.id === e.profileId)!;
    // The vehicle they drive: the one the owner set them on (Vehicles and New sale read the same).
    const drives = phase4.vehicles.find((v) => v.driverId === e.profileId);
    return {
      ...profile,
      ...e,
      vehicle: drives ? phase4.vehicleLabel(drives) : e.vehicle,
      vehicleId: drives?.id,
      partiesCount: sample.parties.filter((p) => p.assignedTo === e.profileId).length,
      loanBalance: phase3.loans.filter((l) => l.profileId === e.profileId).reduce((s, l) => s + loanBalance(l), 0),
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
    parties,
    target: (await getTargets()).find((t) => t.profileId === id),
    visits: (await getVisits()).filter((v) => v.profileId === id),
    loans: (await getLoans()).filter((l) => l.profileId === id),
    slips: phase3.salarySlips().filter((s) => s.profileId === id),
  };
}

/** Builds every list made from people and vehicles again, so sales, People and Vehicles show a change at once. */
function rebuildPeopleAndFleet() {
  loadFleet();
  base.loadMasters();
  base2.loadPhase2();
  base3.loadPhase3();
  builtFor = "";
}

/**
 * The owner's changes to a staff member: name (shown everywhere; their records stay theirs), mobile number,
 * designation and, for a driver, the vehicle they drive.
 */
export async function updateStaffDetails(
  id: string,
  change: { name: string; mobile: string; designation: string; vehicleId?: string },
): Promise<{ ok: true } | { ok: false; problem: string }> {
  const person = (await getProfiles()).find((p) => p.id === id);
  if (!person || person.role === "owner") return { ok: false, problem: "That person is no longer on the staff list." };
  if (!isLocalStaff(id)) return { ok: false, problem: "This is a sample staff member; only the firm's own staff can be edited." };
  if (change.mobile !== person.mobile && (await getProfiles()).some((p) => p.id !== id && p.mobile === change.mobile)) {
    return { ok: false, problem: "Someone else already signs in with that mobile number." };
  }
  return saving(() => {
    if (person.role === "driver" && change.vehicleId !== undefined && !saveLocalDriverVehicle(id, change.vehicleId)) return { ok: false as const, problem: "Choose one of our own vehicles." };
    if (change.name !== person.fullName) saveLocalProfileEdit(id, { name: change.name });
    saveLocalStaffFields(id, { mobile: change.mobile, designation: change.designation });
    rebuildPeopleAndFleet();
    return { ok: true as const };
  });
}

/** The owner's changes to one of the firm's own vehicles; returns its id afterwards (a new number can change it). */
export async function updateVehicleDetails(id: string, change: VehicleChange): Promise<{ ok: true; id: string } | { ok: false; problem: string }> {
  await live();
  if (change.driver && !(await getProfiles()).some((p) => p.id === change.driver && p.role === "driver")) return { ok: false, problem: "Choose one of the drivers." };
  return saving(() => {
    const newId = saveLocalVehicle(id, change);
    if (!newId) return { ok: false as const, problem: "Another vehicle already has that number, or this one is a sample vehicle." };
    rebuildPeopleAndFleet();
    return { ok: true as const, id: newId };
  });
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
  const allOrders = [...localOrders(), ...phase3.orders];
  return allOrders
    .filter((o) => canSee(visible, o.godownId))
    .map((o) => {
      const bills = o.saleIds.map((id) => [...localSales(), ...sample.sales].find((s) => s.id === id)).filter((s): s is Sale => Boolean(s));
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

export async function addOrder(input: Omit<Order, "id" | "orderNo">): Promise<Order> {
  return saving(() => {
    const existing = [...localOrders(), ...phase3.orders];
    const orderNo = existing.reduce((max, o) => Math.max(max, o.orderNo), 0) + 1;
    const id = `ord-${Date.now()}`;
    const order: Order = {
      ...input,
      id,
      orderNo,
    };
    saveLocalOrder(order);
    return order;
  });
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  return saving(() => {
    const all = [...localOrders(), ...phase3.orders];
    const found = all.find((o) => o.id === id);
    if (!found) throw new Error("Order not found");
    const updated: Order = { ...found, status };
    saveLocalOrder(updated);
    return updated;
  });
}

export async function getOrder(id: string) {
  await live();
  return (await getOrders()).find((o) => o.id === id);
}

export async function getDeliveries() {
  await live();
  return phase3.deliveries.flatMap((d) => {
    const sale = sample.sales.find((s) => s.id === d.saleId);
    if (!sale) return [];
    return [{
      ...d,
      billNo: sale.billNo,
      partyName: partyName(sale.partyId),
      destination: sale.destination,
      lines: sale.lines,
      driverName: staffName(d.driverId),
    }];
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
      driverMobile: p.driverMobile,
      invoiceNo: p.invoiceNo || undefined,
      invoiceDate: p.invoiceDate,
      invoicePaperKept: Boolean(p.invoicePaperKept),
      unloadingCharges: Boolean(p.unloadingCharges),
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
    driverName: v.driverId ? staffName(v.driverId) : v.rentDriver?.name,
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
    const stops = t.saleIds.map((id) => sample.sales.find((s) => s.id === id)).filter((s): s is Sale => Boolean(s));
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

/** Vehicles with a GPS position, today's route for the lorry, and the places we deliver to. */
export async function getFleetMap() {
  await live();
  return {
    vehicles: (await getVehicles()).filter((v) => v.gps),
    route: phase4.routeToday,
    places: phase4.places.map((f) => ({ name: f.name, lat: f.lat, lng: f.lng })),
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

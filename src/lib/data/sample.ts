/**
 * Sample business data used until Supabase is connected.
 * Products and rates follow the firm's 2023 quotation; parties, people and numbers are made up (deterministically)
 * so every screen has realistic numbers to show. The firm's own records come from local-data/ (see local-data.ts).
 * Replaced in the Supabase step.
 */
import { shiftMonth } from "@/lib/format";
import type {
  Commitment,
  Godown,
  Party,
  Payment,
  PaymentMode,
  Product,
  Profile,
  Purchase,
  Quotation,
  Receipt,
  Sale,
  StockMovement,
} from "./types";
import { withLocalCustomers, withLocalGodowns, withLocalProducts, withLocalProfiles, withLocalSuppliers } from "./local-data";

/** Sample godowns; the real list (local-data/godowns.json) replaces them, with in-charges from the staff list. */
const sampleGodowns: Godown[] = [
  { id: "g-polaki", name: "Polaki godown", place: "Polaki", own: true, inCharge: ["u-godown"] },
  { id: "g-srikakulam", name: "Srikakulam godown", place: "Srikakulam", own: true, inCharge: ["u-godown"] },
];

/** Sample products; the real list (local-data/products.json) replaces those with the same id and adds the rest. */
const sampleProducts: Product[] = [
  { id: "p-deccan-opc", name: "Deccan OPC", brand: "Deccan", variant: "OPC", category: "cement", unit: "bag", active: true },
  { id: "p-deccan-ppc", name: "Deccan PPC", brand: "Deccan", variant: "PPC", category: "cement", unit: "bag", active: true },
  { id: "p-ms-vishaka", name: "MS iron Vishaka", brand: "Vishaka", variant: "MS iron", category: "steel", unit: "kg", active: true },
  { id: "p-tmt-8", name: "TMT 8 mm", brand: "Vishaka", variant: "TMT 8 mm", category: "steel", unit: "kg", active: true },
  { id: "p-tmt-12", name: "TMT 12 mm", brand: "Vishaka", variant: "TMT 12 mm", category: "steel", unit: "kg", active: true },
];

/** The owner and staff. The real staff list (local-data/staff.json, not in git) replaces the sample staff when present. */
export const sampleProfiles: Profile[] = [
  { id: "u-owner", fullName: "Owner", initials: "OW", mobile: "9000000000", role: "owner", active: true },
  { id: "u-office", fullName: "Office desk", initials: "OD", mobile: "9000000001", email: "office@ska.example", role: "office", active: true },
  { id: "u-godown", fullName: "Godown in-charge", initials: "GI", mobile: "9000000002", role: "godown", active: true },
  { id: "u-ramana", fullName: "Ramana", initials: "RA", mobile: "9000000003", role: "field", active: true },
  { id: "u-venkatesh", fullName: "Venkatesh", initials: "VE", mobile: "9000000004", role: "field", active: true },
  { id: "u-driver", fullName: "Suresh (driver)", initials: "SU", mobile: "9000000005", role: "driver", active: true },
];

/** Sample parties with the real suppliers (local-data/suppliers.json), plus the customers added in the app. */
const sampleParties: Party[] = [
  // Not sample data: the app's own entry for walk-in buyers (their name and phone are taken on each bill).
  { id: "cash", name: "Cash customer", kind: "cash", creditLimit: null, openingBalance: 0, original: true },
  {
    id: "raja",
    name: "Sri Durga Agencies",
    kind: "customer",
    place: "Srikurmam",
    gstin: "37ABCDE1234F1Z5",
    creditLimit: 500000,
    openingBalance: 180000,
  },
  { id: "sai", name: "Sri Sai Traders", kind: "sub_dealer", place: "Tekkali", creditLimit: 300000, openingBalance: 85000, assignedTo: "u-ramana" },
  { id: "venk", name: "Venkateswara Building Materials", kind: "sub_dealer", place: "Narasannapeta", creditLimit: 400000, openingBalance: 120000, assignedTo: "u-venkatesh" },
  { id: "lakshmi", name: "Lakshmi Ganapathi Hardware", kind: "customer", place: "Amadalavalasa", creditLimit: 200000, openingBalance: 40000, assignedTo: "u-venkatesh" },
  { id: "durga", name: "Durga Constructions", kind: "customer", place: "Palasa", creditLimit: 600000, openingBalance: 210000, assignedTo: "u-venkatesh" },
  { id: "rama", name: "Sri Rama Cement Stores", kind: "sub_dealer", place: "Kotabommali", creditLimit: 250000, openingBalance: 60000, assignedTo: "u-ramana" },
  { id: "satya", name: "Satya Builders", kind: "customer", place: "Srikakulam", creditLimit: 800000, openingBalance: 0 },
  { id: "gayatri", name: "Gayatri Enterprises", kind: "sub_dealer", place: "Ponduru", creditLimit: 150000, openingBalance: 95000, assignedTo: "u-ramana" },
  { id: "ravi", name: "Ravi Kumar (house site)", kind: "customer", place: "Etcherla", creditLimit: 50000, openingBalance: 0 },
  { id: "deccan", name: "Deccan Cements Ltd", kind: "company", place: "Hyderabad", creditLimit: null, openingBalance: -350000 },
  { id: "vishaka", name: "Vishaka Steel Traders", kind: "company", place: "Visakhapatnam", creditLimit: null, openingBalance: -180000 },
  { id: "ganesh", name: "Ganesh Transport", kind: "lorry_owner", place: "Polaki", creditLimit: null, openingBalance: -12000 },
];

// The lists every screen reads: the sample ones with the firm's own records in their place (local-data.ts).
export let godowns: Godown[];
export let products: Product[];
export let profiles: Profile[];
/** The parties every screen shows: Cash customer, the suppliers and the firm's own customers; no sample customers. */
export let parties: Party[];
/**
 * The sample generator's own list, with the sample customers, so the sample book is made the same way every time;
 * lib/data drops whatever it made for them before any screen sees it (withoutSampleParties).
 */
export let bookParties: Party[];

/** Builds the lists from the sample ones and the records: when the server starts, and whenever the records change. */
export function loadMasters() {
  godowns = withLocalGodowns(sampleGodowns);
  // Copies, because adding a product or a party adds it to these lists.
  products = withLocalProducts([...sampleProducts]);
  profiles = withLocalProfiles(sampleProfiles);
  bookParties = withLocalSuppliers([...sampleParties]);
  parties = withLocalCustomers(withLocalSuppliers(sampleParties.filter((p) => p.kind === "cash" || p.kind === "company")));
}

loadMasters();

export function defaultTerms(): string[] {
  return [
    "The above prices are inclusive of all taxes.",
    "Unloading for cement is the buyer's responsibility.",
    "The above prices are FOR.",
  ];
}

// ── Dates ────────────────────────────────────────────────────────────────────

/** Small seeded random generator so the sample data is identical on every load. */
export function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The sample records were written for a "today" of 26 October 2026. at() keeps each written date the same
 * number of days away from the real today, so the screens always show a busy, current-looking business.
 */
export function dateShifter(today: string) {
  const shift = Math.round((Date.parse(today) - Date.parse("2026-10-26")) / 86_400_000);
  return (iso: string) => addDays(iso, shift);
}

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "2026-10" → "October". */
export const monthName = (isoMonth: string) => monthNames[Number(isoMonth.slice(5, 7)) - 1];
/** "2026-11-12" → "12 November". */
export const dayMonth = (iso: string) => `${Number(iso.slice(8, 10))} ${monthName(iso.slice(0, 7))}`;

/** Salary is paid on the 5th for the month before: the last month paid by `today`, and the day it was paid. */
export function salaryPayday(today: string) {
  const thisMonth = today.slice(0, 7);
  const paidThisMonth = today >= `${thisMonth}-05`;
  const on = `${paidThisMonth ? thisMonth : shiftMonth(thisMonth, -1)}-05`;
  return { month: shiftMonth(on.slice(0, 7), -1), on };
}

/**
 * The dated records (quotations, purchases, stock, sales, receipts, advances, payments) for a given today,
 * generated the same way every time. lib/data builds this once a day.
 */
export function buildSample(SAMPLE_TODAY: string) {
  const at = dateShifter(SAMPLE_TODAY);
  // The generator's full party list (sample customers included); never the firm's own customers.
  const parties = bookParties;
  const quotations: Quotation[] = [
    {
      id: "q-2023-12",
      quoteNo: "12/2023-2024",
      date: "2023-05-10",
      clientName: "Sri Durga Agencies",
      clientGstin: "37ABCDE1234F1Z5",
      site: "Srikurmam",
      lines: [
        { productId: "p-deccan-opc", description: "Deccan OPC", qty: 450, qtyLabel: "450", rate: 360 },
        { productId: "p-ms-vishaka", description: "MS iron Vishaka", qty: 2000, qtyLabel: "2000 kg", rate: 70 },
      ],
      terms: defaultTerms(),
      status: "accepted",
    },
    {
      id: "q-2026-05",
      quoteNo: "05/2026-2027",
      date: at("2026-10-20"),
      clientName: "Satya Builders",
      site: "Srikakulam",
      lines: [{ productId: "p-deccan-ppc", description: "Deccan PPC", qty: 1000, qtyLabel: "1000", rate: 335 }],
      terms: defaultTerms(),
      status: "sent",
    },
    {
      id: "q-2026-06",
      quoteNo: "06/2026-2027",
      date: at("2026-10-24"),
      clientName: "Durga Constructions",
      site: "Palasa",
      lines: [{ productId: "p-tmt-12", description: "TMT 12 mm", qty: 5000, qtyLabel: "5000 kg", rate: 70 }],
      terms: defaultTerms(),
      status: "draft",
    },
  ];

  const rand = mulberry32(2026);
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];
  const between = (min: number, max: number, step = 1) => min + Math.floor((rand() * (max - min)) / step + 0.5) * step;

  const OPENING_DATE = addDays(SAMPLE_TODAY, -30);
  const FIRST_DAY = addDays(OPENING_DATE, 1);

  // Sample purchases removed: purchases start empty until entered by staff/owner.
  const purchases: Purchase[] = [];

  const stockMovements: StockMovement[] = [];
  const openingStock: [string, string, number][] = [
    ["g-polaki", "p-deccan-opc", 900],
    ["g-polaki", "p-deccan-ppc", 400],
    ["g-polaki", "p-ms-vishaka", 6000],
    ["g-polaki", "p-tmt-8", 3000],
    ["g-polaki", "p-tmt-12", 2000],
    ["g-srikakulam", "p-deccan-opc", 300],
    ["g-srikakulam", "p-deccan-ppc", 200],
    ["g-srikakulam", "p-ms-vishaka", 2000],
  ];
  const stockOnHand = new Map<string, number>();
  const stockKey = (godownId: string, productId: string) => `${godownId}|${productId}`;
  function moveStock(m: Omit<StockMovement, "id">) {
    stockMovements.push({ ...m, id: `sm-${stockMovements.length + 1}` });
    const key = stockKey(m.godownId, m.productId);
    stockOnHand.set(key, (stockOnHand.get(key) ?? 0) + m.qty);
  }
  openingStock.forEach(([godownId, productId, qty]) =>
    moveStock({ date: OPENING_DATE, godownId, productId, qty, kind: "opening", ref: "Opening stock" }),
  );

  const customers = parties.filter((p) => p.kind === "customer" || p.kind === "sub_dealer");

  // Sample sales removed: sales start empty until entered by staff/owner.
  const sales: Sale[] = [];

  const receipts: Receipt[] = [];
  let receiptNo = 801;
  const modes: PaymentMode[] = ["cash", "upi", "cheque", "neft"];
  customers.forEach((party) => {
    const billed = party.openingBalance + sales.filter((s) => s.partyId === party.id && s.status === "saved" && s.billDate < SAMPLE_TODAY).reduce((s, x) => s + x.total, 0);
    // A few slow payers keep part of their old balance unpaid, so the ageing report has something over 30 days.
    const slowPayers: Record<string, number> = { gayatri: 0.12, durga: 0.3, lakshmi: 0.25 };
    let toCollect = Math.round((billed * (slowPayers[party.id] ?? 0.45 + rand() * 0.3)) / 1000) * 1000;
    let date = addDays(FIRST_DAY, between(1, 6));
    while (toCollect > 0 && date < SAMPLE_TODAY) {
      const amount = Math.min(toCollect, Math.round(between(20000, 120000) / 1000) * 1000);
      const mode = pick(modes);
      receipts.push({
        id: `rec-${receiptNo}`,
        receiptNo: receiptNo++,
        partyId: party.id,
        date,
        amount,
        mode,
        reference: mode === "cheque" ? `CHQ ${between(100000, 999999)}` : mode === "upi" || mode === "neft" ? `UTR${between(10000000, 99999999)}` : undefined,
        collectedBy: mode === "cash" ? (party.assignedTo ?? "u-office") : undefined,
      });
      toCollect -= amount;
      date = addDays(date, between(4, 9));
    }
  });
  // Customer advances: two fixed-price cement commitments and one plain advance (each paid as a receipt).
  const commitments: Commitment[] = [
    {
      id: "adv-1",
      partyId: "satya",
      kind: "fixed_price",
      productId: "p-deccan-opc",
      rate: 345,
      bags: 1000,
      amount: 345000,
      date: at("2026-10-01"),
      mode: "neft",
      terms: "Rate fixed for three months; lifted in lots of at least 100 bags.",
      receiptId: "rec-adv-1",
    },
    {
      id: "adv-2",
      partyId: "durga",
      kind: "fixed_price",
      productId: "p-deccan-ppc",
      rate: 330,
      bags: 500,
      amount: 165000,
      date: at("2026-10-10"),
      mode: "cheque",
      receiptId: "rec-adv-2",
    },
    { id: "adv-3", partyId: "venk", kind: "advance", amount: 100000, date: at("2026-10-15"), mode: "upi", terms: "Adjust against the next bills.", receiptId: "rec-adv-3" },
  ];
  commitments.forEach((c) =>
    receipts.push({
      id: c.receiptId,
      receiptNo: receiptNo++,
      partyId: c.partyId,
      date: c.date,
      amount: c.amount,
      mode: c.mode,
      reference: c.mode === "cheque" ? "CHQ 482211" : `UTR${55100000 + receiptNo}`,
      remarks: c.kind === "fixed_price" ? `Advance for ${c.bags} bags at ₹${c.rate}` : "Advance against future bills",
    }),
  );

  // Walk-in cash sales are paid on the spot, so each one has a matching cash receipt.
  sales
    .filter((s) => s.partyId === "cash" && s.status === "saved")
    .forEach((s) =>
      receipts.push({
        id: `rec-cash-${s.billNo}`,
        receiptNo: receiptNo++,
        partyId: "cash",
        date: s.billDate,
        amount: s.total,
        mode: "cash",
        remarks: `Paid at the counter, bill ${s.billNo}`,
      }),
    );
  receipts.push(
    { id: "rec-today-1", receiptNo: receiptNo++, partyId: "venk", date: SAMPLE_TODAY, amount: 80000, mode: "cash", collectedBy: "u-venkatesh" },
    { id: "rec-today-2", receiptNo: receiptNo++, partyId: "rama", date: SAMPLE_TODAY, amount: 60000, mode: "cash", collectedBy: "u-ramana" },
  );
  receipts.sort((a, b) => a.date.localeCompare(b.date) || a.receiptNo - b.receiptNo);

  const allPayments: Payment[] = [
    { id: "pay-1", paymentNo: 501, partyId: "deccan", date: at("2026-10-03"), amount: 300000, mode: "neft", reference: "UTR55104411" },
    { id: "pay-2", paymentNo: 502, partyId: "vishaka", date: at("2026-10-08"), amount: 250000, mode: "cheque", reference: "CHQ 104552" },
    { id: "pay-3", paymentNo: 503, partyId: "deccan", date: at("2026-10-14"), amount: 450000, mode: "neft", reference: "UTR55109932" },
    { id: "pay-4", paymentNo: 504, partyId: "ganesh", date: at("2026-10-20"), amount: 12000, mode: "cash", remarks: "Freight for last month" },
    { id: "pay-5", paymentNo: 505, partyId: "deccan", date: at("2026-10-22"), amount: 400000, mode: "neft", reference: "UTR55113390" },
    { id: "pay-6", paymentNo: 506, partyId: "vishaka", date: at("2026-10-25"), amount: 300000, mode: "neft", reference: "UTR55114021" },
  ];
  // Only sample parties still in the list: the firm's own suppliers get no sample payments.
  const payments = allPayments.filter((p) => parties.some((x) => x.id === p.partyId && !x.original));

  return { SAMPLE_TODAY, OPENING_DATE, FIRST_DAY, quotations, purchases, stockMovements, sales, receipts, commitments, payments };
}

export type SampleBook = ReturnType<typeof buildSample>;

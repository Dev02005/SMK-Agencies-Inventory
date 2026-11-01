/**
 * Sample business data used until Supabase is connected.
 * Products, rates and the Sri Rajarajeswari party come from the May 2023 SKA quotation; everything else is
 * generated (deterministically) so every screen has realistic numbers to show. Replaced in the Supabase step.
 */
import { shiftMonth } from "@/lib/format";
import { computeTotals, type TransportMode } from "@/lib/sales";
import type {
  Commitment,
  Firm,
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

export const firm: Firm = {
  id: "firm-ska",
  name: "Sri Kameswari Agencies",
  gstin: "37AELPP5465R1ZE",
  address: "Polaki 532 429, Srikakulam Dist. (A.P.)",
  phone: "9949245484",
};

/** The owner bills under two firms; the first is the main one (sign-in page, reports, statements). */
export const firms: Firm[] = [
  firm,
  {
    id: "firm-2",
    name: "Second firm",
    gstin: "",
    address: "Polaki 532 429, Srikakulam Dist. (A.P.)",
    phone: "9949245484",
  },
];

export const godowns: Godown[] = [
  { id: "g-polaki", name: "Polaki godown", place: "Polaki" },
  { id: "g-srikakulam", name: "Srikakulam godown", place: "Srikakulam" },
];

export const products: Product[] = [
  { id: "p-deccan-opc", name: "Deccan OPC", brand: "Deccan", variant: "OPC", category: "cement", unit: "bag", listRate: 360, active: true },
  { id: "p-deccan-ppc", name: "Deccan PPC", brand: "Deccan", variant: "PPC", category: "cement", unit: "bag", listRate: 340, active: true },
  { id: "p-ms-vishaka", name: "MS iron Vishaka", brand: "Vishaka", variant: "MS iron", category: "steel", unit: "kg", listRate: 70, active: true },
  { id: "p-tmt-8", name: "TMT 8 mm", brand: "Vishaka", variant: "TMT 8 mm", category: "steel", unit: "kg", listRate: 72, active: true },
  { id: "p-tmt-12", name: "TMT 12 mm", brand: "Vishaka", variant: "TMT 12 mm", category: "steel", unit: "kg", listRate: 71, active: true },
];

export const profiles: Profile[] = [
  { id: "u-owner", fullName: "P. Srinivasa Rao", initials: "PS", mobile: "9949245484", role: "owner", active: true },
  { id: "u-office", fullName: "Office desk", initials: "OD", mobile: "9000000001", email: "office@ska.example", role: "office", active: true },
  { id: "u-godown", fullName: "Godown in-charge", initials: "GI", mobile: "9000000002", role: "godown", active: true },
  { id: "u-ramana", fullName: "Ramana", initials: "RA", mobile: "9000000003", role: "field", active: true },
  { id: "u-venkatesh", fullName: "Venkatesh", initials: "VE", mobile: "9000000004", role: "field", active: true },
  { id: "u-driver", fullName: "Suresh (driver)", initials: "SU", mobile: "9000000005", role: "driver", active: true },
];

export const parties: Party[] = [
  { id: "cash", name: "Cash customer", kind: "cash", creditLimit: null, openingBalance: 0 },
  {
    id: "raja",
    name: "Sri Rajarajeswari Agencies",
    kind: "customer",
    place: "Srikurmam",
    gstin: "37AEPPK7944C1Z6",
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
  const quotations: Quotation[] = [
    {
      id: "q-2023-12",
      quoteNo: "12/2023-2024",
      date: "2023-05-10",
      clientName: "Sri Rajarajeswari Agencies",
      clientGstin: "37AEPPK7944C1Z6",
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

  const purchases: Purchase[] = [];
  const purchasePlan: [string, string, [string, number, number][]][] = [
    [at("2026-09-28"), "deccan", [["p-deccan-opc", 600, 320], ["p-deccan-ppc", 200, 300]]],
    [at("2026-10-02"), "vishaka", [["p-ms-vishaka", 6000, 64], ["p-tmt-8", 3000, 66]]],
    [at("2026-10-05"), "deccan", [["p-deccan-opc", 800, 320]]],
    [at("2026-10-12"), "deccan", [["p-deccan-opc", 600, 320], ["p-deccan-ppc", 200, 300]]],
    [at("2026-10-16"), "vishaka", [["p-ms-vishaka", 5000, 64], ["p-tmt-12", 4000, 65]]],
    [at("2026-10-19"), "deccan", [["p-deccan-opc", 800, 320]]],
    [at("2026-10-23"), "vishaka", [["p-tmt-8", 3000, 66], ["p-ms-vishaka", 4000, 64]]],
    [at("2026-10-24"), "deccan", [["p-deccan-opc", 600, 320], ["p-deccan-ppc", 200, 300]]],
    // Came in today: its bags are already in the godown's stock.
    [at("2026-10-25"), "deccan", [["p-deccan-opc", 800, 320], ["p-deccan-ppc", 200, 300]]],
  ];
  purchasePlan.forEach(([invoiceDate, companyId, lines], i) => {
    const freight = companyId === "deccan" ? 0 : 6000;
    purchases.push({
      id: `pur-${i + 1}`,
      purchaseNo: 301 + i,
      companyId,
      invoiceNo: `${companyId === "deccan" ? "DCL" : "VST"}/26/${4100 + i * 7}`,
      invoiceDate,
      receivedDate: addDays(invoiceDate, companyId === "deccan" ? 1 : 0),
      lorryNo: companyId === "deccan" ? "AP 39 T 7781" : "AP 31 TB 2204",
      // Today's lorry comes to Polaki, where today's bills are loaded; earlier ones are spread over both godowns.
      godownId: i === purchasePlan.length - 1 || i % 3 !== 2 ? "g-polaki" : "g-srikakulam",
      lines: lines.map(([productId, qty, rate]) => ({ productId, qty, rate })),
      freight,
      total: lines.reduce((s, [, qty, rate]) => s + qty * rate, 0) + freight,
    });
  });
  // A Deccan lorry selling straight off the truck instead of unloading into a godown.
  const LORRY_ON_SALE = "AP 39 T 9902";
  purchases.push({
    id: "pur-lorry-1",
    purchaseNo: 301 + purchasePlan.length,
    companyId: "deccan",
    invoiceNo: "DCL/26/4199",
    invoiceDate: at("2026-10-24"),
    receivedDate: at("2026-10-25"),
    lorryNo: LORRY_ON_SALE,
    godownId: "",
    onLorry: true,
    driverName: "Ramesh",
    invoicePaperKept: true,
    sellOutDays: 3,
    lines: [{ productId: "p-deccan-opc", qty: 600, rate: 320 }],
    freight: 0,
    total: 192000,
  });

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
  // Held back from the day-to-day bills: what later leaves on godown transfers and van/lorry loads (sample-phase4)
  // and on today's fixed bills, so no godown's stock ever shows below zero.
  const keepBack: Record<string, number> = {
    "g-polaki|p-deccan-opc": 410,
    "g-polaki|p-deccan-ppc": 100,
    "g-polaki|p-tmt-8": 1000,
    "g-polaki|p-ms-vishaka": 2000,
    "g-srikakulam|p-deccan-opc": 120,
  };
  const sellable = (godownId: string, productId: string) => {
    const key = stockKey(godownId, productId);
    return Math.max(0, (stockOnHand.get(key) ?? 0) - (keepBack[key] ?? 0));
  };
  function moveStock(m: Omit<StockMovement, "id">) {
    stockMovements.push({ ...m, id: `sm-${stockMovements.length + 1}` });
    const key = stockKey(m.godownId, m.productId);
    stockOnHand.set(key, (stockOnHand.get(key) ?? 0) + m.qty);
  }
  openingStock.forEach(([godownId, productId, qty]) =>
    moveStock({ date: OPENING_DATE, godownId, productId, qty, kind: "opening", ref: "Opening stock" }),
  );

  const productById = (id: string) => products.find((p) => p.id === id)!;
  const customers = parties.filter((p) => p.kind === "customer" || p.kind === "sub_dealer");
  const billers = ["u-owner", "u-office", "u-office", "u-ramana", "u-venkatesh"];

  const sales: Sale[] = [];
  let billNo = 1201;

  function addSale(input: {
    partyId: string;
    billDate: string;
    godownId: string;
    lines: { productId: string; qty: number; rate: number }[];
    transportMode: TransportMode;
    transportCharge: number;
    unloadingCharge?: number;
    discountAmount?: number;
    status?: Sale["status"];
    overrideReason?: string;
    createdBy: string;
    remarks?: string;
    source?: Sale["source"];
    vehicleNo?: string;
  }) {
    const totals = computeTotals({
      lines: input.lines,
      discountMode: "amount",
      discountValue: input.discountAmount ?? 0,
      transportMode: input.transportMode,
      transportCharge: input.transportCharge,
      unloadingCharge: input.unloadingCharge ?? 0,
      otherCharge: 0,
    });
    const party = parties.find((p) => p.id === input.partyId)!;
    const sale: Sale = {
      id: `sale-${billNo}`,
      billNo: billNo++,
      partyId: input.partyId,
      billDate: input.billDate,
      receivedDate: input.transportMode === "FOR" && rand() < 0.3 ? addDays(input.billDate, 1) : undefined,
      source: input.source ?? "godown",
      godownId: input.godownId || undefined,
      vehicleNo: input.vehicleNo,
      transportMode: input.transportMode,
      transportCharge: totals.transport,
      unloadingCharge: input.unloadingCharge ?? 0,
      otherCharge: 0,
      discountAmount: totals.discount,
      subtotal: totals.subtotal,
      total: totals.total,
      destination: party.place,
      paperMemo: rand() < 0.4 ? String(between(4400, 4800)) : undefined,
      remarks: input.remarks,
      status: input.status ?? "saved",
      overrideReason: input.overrideReason,
      createdBy: input.createdBy,
      lines: input.lines.map((l) => ({ ...l, listRate: productById(l.productId).listRate })),
    };
    sales.push(sale);
    // Lorry sales come off the truck, not out of a godown.
    if (sale.status === "saved" && sale.source === "godown") {
      sale.lines.forEach((l) =>
        moveStock({ date: sale.billDate, godownId: input.godownId, productId: l.productId, qty: -l.qty, kind: "sale", ref: `Bill ${sale.billNo}` }),
      );
    }
    return sale;
  }

  // A purchase is the only way stock comes in: the lorry unloads at the purchase's godown on the day it arrives.
  const receive = (day: string) =>
    purchases
      .filter((p) => p.receivedDate === day && !p.onLorry)
      .forEach((p) =>
        p.lines.forEach((l) =>
          moveStock({ date: day, godownId: p.godownId, productId: l.productId, qty: l.qty, kind: "inward", ref: `Purchase ${p.purchaseNo}` }),
        ),
      );

  for (let day = FIRST_DAY; day < SAMPLE_TODAY; day = addDays(day, 1)) {
    receive(day);

    const isSunday = new Date(`${day}T00:00:00Z`).getUTCDay() === 0;
    const bills = isSunday ? (rand() < 0.3 ? 1 : 0) : between(1, 3);
    for (let b = 0; b < bills; b++) {
      const party = rand() < 0.12 ? parties[0] : pick(customers);
      const godownId = rand() < 0.75 ? "g-polaki" : "g-srikakulam";
      const lines: { productId: string; qty: number; rate: number }[] = [];
      const wantCement = rand() < 0.8;
      const wantSteel = !wantCement || rand() < 0.35;
      if (wantCement) {
        const product = productById(rand() < 0.7 ? "p-deccan-opc" : "p-deccan-ppc");
        const qty = Math.min(between(20, party.kind === "sub_dealer" ? 300 : 150, 10), sellable(godownId, product.id));
        const rate = rand() < 0.15 ? product.listRate - 5 : product.listRate;
        if (qty >= 10) lines.push({ productId: product.id, qty: Math.floor(qty / 10) * 10, rate });
      }
      if (wantSteel) {
        const product = productById(pick(["p-ms-vishaka", "p-tmt-8", "p-tmt-12"]));
        const qty = Math.min(between(300, 2500, 100), sellable(godownId, product.id));
        if (qty >= 100) lines.push({ productId: product.id, qty: Math.floor(qty / 100) * 100, rate: product.listRate });
      }
      if (lines.length === 0) continue;

      const transportMode: TransportMode = party.kind === "cash" ? "EX" : rand() < 0.6 ? "FOR" : rand() < 0.75 ? "EX" : "RENT";
      const cementBags = lines.filter((l) => productById(l.productId).category === "cement").reduce((s, l) => s + l.qty, 0);
      const rateChanged = lines.some((l) => l.rate !== productById(l.productId).listRate);
      addSale({
        partyId: party.id,
        billDate: day,
        godownId,
        lines,
        transportMode,
        transportCharge: transportMode === "EX" ? 0 : between(1500, 6000, 500),
        unloadingCharge: transportMode === "FOR" && rand() < 0.4 ? cementBags * 3 : 0,
        discountAmount: rand() < 0.15 ? 500 : 0,
        overrideReason: rateChanged ? "Bulk order rate agreed by owner" : undefined,
        createdBy: party.assignedTo && rand() < 0.5 ? party.assignedTo : pick(billers),
      });
    }
  }

  // Bills sold straight off the lorry at a slightly lower rate for lifting from the truck.
  const lorrySale = (partyId: string, billDate: string, qty: number, createdBy: string) =>
    addSale({
      partyId,
      billDate,
      godownId: "",
      source: "lorry",
      vehicleNo: LORRY_ON_SALE,
      lines: [{ productId: "p-deccan-opc", qty, rate: 355 }],
      transportMode: "EX",
      transportCharge: 0,
      overrideReason: "Lorry rate for lifting from the truck",
      createdBy,
    });
  lorrySale("rama", at("2026-10-25"), 150, "u-ramana");
  lorrySale("venk", at("2026-10-25"), 200, "u-venkatesh");
  lorrySale("lakshmi", SAMPLE_TODAY, 100, "u-venkatesh");

  // Today: the lorry that came in, then the quotation bill (over the limit, saved by the owner with a reason),
  // a normal bill and a staff bill waiting for approval.
  receive(SAMPLE_TODAY);
  addSale({
    partyId: "raja",
    billDate: SAMPLE_TODAY,
    godownId: "g-polaki",
    lines: [
      { productId: "p-deccan-opc", qty: 450, rate: 360 },
      { productId: "p-ms-vishaka", qty: 2000, rate: 70 },
    ],
    transportMode: "FOR",
    transportCharge: 0,
    overrideReason: "Long-standing customer; balance promised by month end",
    createdBy: "u-owner",
  });
  addSale({
    partyId: "sai",
    billDate: SAMPLE_TODAY,
    godownId: "g-polaki",
    lines: [{ productId: "p-deccan-ppc", qty: 120, rate: 340 }],
    transportMode: "FOR",
    transportCharge: 2000,
    createdBy: "u-ramana",
  });
  addSale({
    partyId: "gayatri",
    billDate: SAMPLE_TODAY,
    godownId: "g-polaki",
    lines: [{ productId: "p-deccan-opc", qty: 200, rate: 360 }],
    transportMode: "FOR",
    transportCharge: 3000,
    status: "pending_approval",
    createdBy: "u-ramana",
    remarks: "Party asked for delivery tomorrow morning",
  });
  // One cancelled bill so the status shows up in lists; its stock goes back in.
  {
    const cancelled = sales[9];
    cancelled.status = "cancelled";
    cancelled.remarks = "Party cancelled the order";
    cancelled.lines.forEach((l) =>
      moveStock({ date: cancelled.billDate, godownId: cancelled.godownId!, productId: l.productId, qty: l.qty, kind: "sale", ref: `Bill ${cancelled.billNo} cancelled` }),
    );
  }

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

  const payments: Payment[] = [
    { id: "pay-1", paymentNo: 501, partyId: "deccan", date: at("2026-10-03"), amount: 300000, mode: "neft", reference: "UTR55104411" },
    { id: "pay-2", paymentNo: 502, partyId: "vishaka", date: at("2026-10-08"), amount: 250000, mode: "cheque", reference: "CHQ 104552" },
    { id: "pay-3", paymentNo: 503, partyId: "deccan", date: at("2026-10-14"), amount: 450000, mode: "neft", reference: "UTR55109932" },
    { id: "pay-4", paymentNo: 504, partyId: "ganesh", date: at("2026-10-20"), amount: 12000, mode: "cash", remarks: "Freight for last month" },
    { id: "pay-5", paymentNo: 505, partyId: "deccan", date: at("2026-10-22"), amount: 400000, mode: "neft", reference: "UTR55113390" },
    { id: "pay-6", paymentNo: 506, partyId: "vishaka", date: at("2026-10-25"), amount: 300000, mode: "neft", reference: "UTR55114021" },
  ];

  return { SAMPLE_TODAY, OPENING_DATE, FIRST_DAY, quotations, purchases, stockMovements, sales, receipts, commitments, payments };
}

export type SampleBook = ReturnType<typeof buildSample>;

/**
 * Sample data for phase 2 screens: staff cash, expenses, banks, bad debts, reminders and the owner's
 * personal records. Built on top of sample.ts so the cash book agrees with the receipts already there.
 */
import { addDays, FIRST_DAY, mulberry32, parties, payments, profiles, purchases, receipts, sales, SAMPLE_TODAY } from "./sample";
import type {
  BadDebt,
  BankAccount,
  BankEntry,
  CashCount,
  CashHandover,
  Chit,
  Expense,
  InsurancePolicy,
  Note,
  Reminder,
  Rental,
  VaultDocument,
} from "./types";

const rand = mulberry32(77);
const between = (min: number, max: number, step = 1) => min + Math.floor((rand() * (max - min)) / step + 0.5) * step;

export const OFFICE = "office";

// ── Banks ────────────────────────────────────────────────────────────────────

export const bankAccounts: BankAccount[] = [
  { id: "acc-sbi", bank: "State Bank of India", name: "SBI current · Polaki", accountNo: "•••• 4521", scope: "business", openingBalance: 450000 },
  { id: "acc-ubi", bank: "Union Bank of India", name: "Union Bank current", accountNo: "•••• 0917", scope: "business", openingBalance: 120000 },
  { id: "acc-home", bank: "State Bank of India", name: "SBI savings (personal)", accountNo: "•••• 3308", scope: "personal", openingBalance: 235000 },
];

/** Opening cash in hand on the opening date. */
export const openingCash: Record<string, number> = { [OFFICE]: 25000, "u-driver": 2000 };

// ── Expenses ─────────────────────────────────────────────────────────────────

export const expenses: Expense[] = [];
let expenseNo = 601;
function addExpense(e: Omit<Expense, "id" | "expenseNo" | "hasPhoto"> & { hasPhoto?: boolean }) {
  expenses.push({ ...e, id: `exp-${expenseNo}`, expenseNo: expenseNo++, hasPhoto: e.hasPhoto ?? rand() < 0.5 });
}

const VAN = "Van AP 30 TA 4521";
const LORRY = "Lorry AP 30 TB 1186";
/** Company vehicles until the fleet module (phase 4) has its own records. */
export const vehicleNames = [VAN, LORRY];

addExpense({ date: "2026-10-01", head: "rent", amount: 15000, paidFrom: "acc-sbi", tag: { kind: "godown", label: "Srikakulam godown" }, description: "October rent, Srikakulam godown" });
const salaries: [string, number][] = [["u-office", 18000], ["u-godown", 16000], ["u-ramana", 15000], ["u-venkatesh", 15000], ["u-driver", 14000]];
salaries.forEach(([id, amount]) => {
  const name = profiles.find((p) => p.id === id)!.fullName;
  addExpense({ date: "2026-10-05", head: "salary", amount, paidFrom: "acc-sbi", tag: { kind: "employee", label: name }, description: `September salary, ${name}`, hasPhoto: false });
});
addExpense({ date: "2026-10-08", head: "electricity", amount: 3240, paidFrom: "cash", paidBy: OFFICE, tag: { kind: "godown", label: "Polaki godown" }, description: "Electricity bill, Polaki godown" });
addExpense({ date: "2026-10-14", head: "vehicle_repair", amount: 6200, paidFrom: "cash", paidBy: OFFICE, tag: { kind: "vehicle", label: LORRY }, description: "Brake lining and labour" });
addExpense({ date: "2026-10-21", head: "other", amount: 1100, paidFrom: "cash", paidBy: OFFICE, description: "Pooja items for the new godown racks" });

for (let day = FIRST_DAY; day <= SAMPLE_TODAY; day = addDays(day, 1)) {
  const sunday = new Date(`${day}T00:00:00Z`).getUTCDay() === 0;
  if (!sunday && rand() < 0.55) {
    addExpense({ date: day, head: "fuel", amount: between(1500, 3500, 100), paidFrom: "cash", paidBy: "u-driver", tag: { kind: "vehicle", label: rand() < 0.7 ? LORRY : VAN }, description: "Diesel" });
  }
  if (!sunday && rand() < 0.25) {
    addExpense({ date: day, head: "driver", amount: between(600, 1200, 100), paidFrom: "cash", paidBy: OFFICE, tag: { kind: "employee", label: "Suresh (driver)" }, description: "Trip batta" });
  }
  if (new Date(`${day}T00:00:00Z`).getUTCDay() === 6) {
    addExpense({ date: day, head: "office", amount: between(300, 900, 50), paidFrom: "cash", paidBy: OFFICE, description: "Tea, water cans and stationery", hasPhoto: false });
  }
  purchases
    .filter((p) => p.receivedDate === day)
    .forEach((p) => {
      const bags = p.lines.filter((l) => l.productId.startsWith("p-deccan")).reduce((s, l) => s + l.qty, 0);
      if (bags > 0) {
        addExpense({ date: day, head: "loading", amount: bags * 2, paidFrom: "cash", paidBy: OFFICE, tag: { kind: "godown", label: p.godownId === "g-polaki" ? "Polaki godown" : "Srikakulam godown" }, description: `Unloading ${bags} bags, lorry ${p.lorryNo}` });
      }
    });
}
expenses.sort((a, b) => a.date.localeCompare(b.date) || a.expenseNo - b.expenseNo);

// ── Cash handovers ───────────────────────────────────────────────────────────
// Field staff hand most of their cash to the office every few days; the office banks its surplus
// and gives the driver money for diesel. Today Venkatesh has handed over and Ramana has not.

export const handovers: CashHandover[] = [];
let handoverId = 1;
const held: Record<string, number> = { "u-ramana": 0, "u-venkatesh": 0, [OFFICE]: openingCash[OFFICE], "u-driver": openingCash["u-driver"] };

/** Who is holding the cash from a receipt: the field staff member who collected it, otherwise the office. */
export function cashHolderOf(receipt: { collectedBy?: string }): string {
  const by = receipt.collectedBy;
  return by && by !== "u-office" && by !== "u-owner" ? by : OFFICE;
}

const cashIn = (holder: string, day: string) =>
  receipts.filter((r) => r.date === day && r.mode === "cash" && cashHolderOf(r) === holder).reduce((s, r) => s + r.amount, 0);
const cashOut = (holder: string, day: string) =>
  expenses.filter((e) => e.date === day && e.paidFrom === "cash" && e.paidBy === holder).reduce((s, e) => s + e.amount, 0) +
  (holder === OFFICE ? payments.filter((p) => p.date === day && p.mode === "cash").reduce((s, p) => s + p.amount, 0) : 0);

function handover(date: string, from: string, to: string, amount: number, note?: string) {
  if (amount <= 0) return;
  handovers.push({ id: `ho-${handoverId++}`, date, from, to, amount, note });
  held[from] = (held[from] ?? 0) - amount;
  if (!to.startsWith("bank:")) held[to] = (held[to] ?? 0) + amount;
}

for (let day = FIRST_DAY; day <= SAMPLE_TODAY; day = addDays(day, 1)) {
  for (const holder of ["u-ramana", "u-venkatesh", "u-driver", OFFICE]) {
    held[holder] = (held[holder] ?? 0) + cashIn(holder, day) - cashOut(holder, day);
  }
  const isToday = day === SAMPLE_TODAY;
  for (const staff of ["u-ramana", "u-venkatesh"]) {
    const due = isToday ? staff === "u-venkatesh" : held[staff] > 90000 || rand() < 0.3;
    if (due) handover(day, staff, OFFICE, isToday ? held[staff] : Math.floor(held[staff] / 1000) * 1000, "Collections handed over");
  }
  if (held["u-driver"] < 3000) handover(day, OFFICE, "u-driver", 8000, "Diesel and trip money");
  if (!isToday && held[OFFICE] > 120000) {
    const deposit = Math.floor((held[OFFICE] - 30000) / 10000) * 10000;
    handover(day, OFFICE, "bank:acc-sbi", deposit, "Cash deposited");
  }
}

export const cashCounts: CashCount[] = [
  { holder: "u-ramana", date: SAMPLE_TODAY, counted: Math.max(0, held["u-ramana"] - 500) },
  { holder: "u-venkatesh", date: SAMPLE_TODAY, counted: 0 },
  { holder: OFFICE, date: SAMPLE_TODAY, counted: held[OFFICE] },
];

// ── Bad debts and reminders ──────────────────────────────────────────────────

function rawBalance(partyId: string) {
  const party = parties.find((p) => p.id === partyId)!;
  const billed = sales.filter((s) => s.partyId === partyId && s.status === "saved").reduce((s, x) => s + x.total, 0);
  const paid = receipts.filter((r) => r.partyId === partyId).reduce((s, r) => s + r.amount, 0);
  return party.openingBalance + billed - paid;
}

const writeOffParty = ["ravi", "lakshmi", "gayatri"].find((id) => rawBalance(id) > 2000) ?? "gayatri";
export const badDebts: BadDebt[] = [
  {
    id: "bd-1",
    partyId: writeOffParty,
    date: "2026-10-18",
    amount: Math.round(Math.min(rawBalance(writeOffParty) * 0.4, 12500) / 100) * 100,
    reason: "Site work stopped; party not reachable for four months",
    approvedBy: "u-owner",
  },
];

export const reminders: Reminder[] = [
  { id: "rm-1", partyId: "gayatri", date: "2026-10-24", channel: "whatsapp", amount: 95000, status: "read" },
  { id: "rm-2", partyId: "durga", date: "2026-10-24", channel: "whatsapp", amount: 120000, status: "delivered" },
  { id: "rm-3", partyId: "lakshmi", date: "2026-10-22", channel: "sms", amount: 40000, status: "delivered" },
  { id: "rm-4", partyId: "sai", date: "2026-10-20", channel: "whatsapp", amount: 60000, status: "read" },
  { id: "rm-5", partyId: "rama", date: "2026-10-17", channel: "whatsapp", amount: 45000, status: "failed" },
  { id: "rm-6", partyId: "gayatri", date: "2026-10-17", channel: "whatsapp", amount: 95000, status: "read" },
];

// ── Personal (owner only) ────────────────────────────────────────────────────

export const chits: Chit[] = [
  {
    id: "chit-1",
    organiser: "Sri Lakshmi Chits, Srikakulam",
    chitNo: "SLC-24/117",
    scope: "personal",
    totalValue: 1000000,
    months: 40,
    instalment: 25000,
    startDate: "2025-01-05",
    dueDay: 5,
    paidMonths: 22,
  },
  {
    id: "chit-2",
    organiser: "Kanaka Durga Chits, Polaki",
    chitNo: "KDC-25/042",
    scope: "business",
    totalValue: 500000,
    months: 25,
    instalment: 20000,
    startDate: "2025-06-30",
    dueDay: 31,
    paidMonths: 16,
    lifted: { month: 9, amount: 410000, date: "2026-02-28" },
  },
];

export const rentals: Rental[] = [
  {
    id: "rent-1",
    property: "Shop 2, Polaki main road",
    direction: "received",
    counterparty: "Sri Venkata Medicals",
    monthlyRent: 12000,
    advance: 100000,
    dueDay: 5,
    agreementEnd: "2027-03-31",
    paidThrough: "2026-10",
    scope: "personal",
  },
  {
    id: "rent-2",
    property: "House upstairs portion, Srikakulam",
    direction: "received",
    counterparty: "Tenant (sample)",
    monthlyRent: 8500,
    advance: 50000,
    dueDay: 10,
    agreementEnd: "2026-12-31",
    paidThrough: "2026-09",
    scope: "personal",
  },
  {
    id: "rent-3",
    property: "Srikakulam godown",
    direction: "paid",
    counterparty: "Godown owner (sample)",
    monthlyRent: 15000,
    advance: 150000,
    dueDay: 1,
    agreementEnd: "2028-05-31",
    paidThrough: "2026-10",
    scope: "business",
  },
];

export const policies: InsurancePolicy[] = [
  { id: "ins-1", kind: "vehicle", title: VAN, insurer: "New India Assurance", policyNo: "•••• 7712", premium: 18500, frequency: "yearly", nextDue: "2026-10-29", sumAssured: 650000 },
  { id: "ins-2", kind: "life", title: "Life policy, P. Srinivasa Rao", insurer: "LIC", policyNo: "•••• 4410", premium: 48000, frequency: "yearly", nextDue: "2027-02-14", sumAssured: 2500000 },
  { id: "ins-3", kind: "health", title: "Family health cover", insurer: "Health insurer (sample)", policyNo: "•••• 9035", premium: 32400, frequency: "yearly", nextDue: "2026-12-20", sumAssured: 1000000 },
  { id: "ins-4", kind: "property", title: "Polaki godown stock and building", insurer: "New India Assurance", policyNo: "•••• 2261", premium: 21800, frequency: "yearly", nextDue: "2027-01-08", sumAssured: 4000000 },
  { id: "ins-5", kind: "vehicle", title: LORRY, insurer: "New India Assurance", policyNo: "•••• 5590", premium: 41200, frequency: "yearly", nextDue: "2026-11-18", sumAssured: 1400000 },
];

export const notes: Note[] = [
  { id: "n-1", title: "Call Deccan rep about November rates", body: "Ask about the dealer discount on lots above 2,000 bags.", pinned: true, remindOn: "2026-10-28" },
  { id: "n-2", title: "Renew trade licence", body: "Municipal office, Polaki. Bring last year's receipt.", pinned: true, remindOn: "2026-12-15" },
  { id: "n-3", title: "Gift for Ramana's family function", body: "12 November.", pinned: false, remindOn: "2026-11-10" },
  { id: "n-4", title: "Shop 2 agreement renewal", body: "Current agreement ends 31 March; discuss 8% increase.", pinned: false },
];

export const documents: VaultDocument[] = [
  { id: "doc-1", title: "Shop 2 rent agreement", kind: "Agreement", fileName: "shop2-agreement-2024.pdf", expires: "2027-03-31", addedOn: "2024-04-02" },
  { id: "doc-2", title: `RC, ${VAN}`, kind: "Vehicle", fileName: "van-rc.jpg", addedOn: "2023-08-11" },
  { id: "doc-3", title: "LIC policy bond", kind: "Insurance", fileName: "lic-bond.pdf", addedOn: "2019-02-14" },
  { id: "doc-4", title: "Property tax receipt 2026–27", kind: "Property", fileName: "property-tax-2026.pdf", addedOn: "2026-05-20" },
  { id: "doc-5", title: "Trade licence", kind: "Licence", fileName: "trade-licence.pdf", expires: "2026-12-31", addedOn: "2026-01-04" },
];

/** Entries in the personal bank account (the business accounts are worked out from receipts and payments). */
export const personalBankEntries: BankEntry[] = [
  { id: "pb-1", accountId: "acc-home", date: "2026-10-05", amount: -25000, description: "Chit instalment, Sri Lakshmi Chits" },
  { id: "pb-2", accountId: "acc-home", date: "2026-10-06", amount: 12000, description: "Rent received, Shop 2" },
  { id: "pb-3", accountId: "acc-home", date: "2026-10-12", amount: -6400, description: "School fees" },
  { id: "pb-4", accountId: "acc-home", date: "2026-10-15", amount: 50000, description: "Drawings from business (SBI current)" },
  { id: "pb-5", accountId: "acc-home", date: "2026-10-20", amount: -18750, description: "Household and groceries" },
];

/** Business bank entries that aren't receipts, payments, expenses or cash deposits. */
export const businessBankExtras: BankEntry[] = [
  { id: "bb-1", accountId: "acc-sbi", date: "2026-10-15", amount: -50000, description: "Drawings to owner (SBI savings)" },
];


/**
 * Reports: each one is worked out from the same data layer as the screens, so a report never disagrees with
 * the screen it summarises. Every report returns plain rows that the report view shows, prints and exports.
 */
import "server-only";
import {
  getAgeingReport,
  getAllStockMovements,
  getAttendanceToday,
  getExpenses,
  getGodowns,
  getOrders,
  getParties,
  getPayments,
  getProducts,
  getProfiles,
  getPurchases,
  getReceipts,
  getSales,
  getToday,
  getTrips,
  getVehicles,
  OPENING_DATE,
} from "@/lib/data";
import { formatDate, formatMonth } from "@/lib/format";
import { expenseHeadLabels, paymentModeLabels } from "@/lib/labels";
import { toMT } from "@/lib/sales";

export type Period = "today" | "7d" | "month" | "all";
export type ColumnKind = "text" | "inr" | "number" | "date";
export type ReportColumn = { key: string; label: string; kind?: ColumnKind };
export type ReportRow = Record<string, string | number | undefined>;
export type ReportResult = { columns: ReportColumn[]; rows: ReportRow[]; totals?: ReportRow; note?: string };

export type ReportDef = {
  key: string;
  title: string;
  description: string;
  group: "Sales" | "Money" | "Stock" | "People" | "Vehicles" | "Activity";
  /** Period choices offered; the first is the default. Omit for "as of today" reports. */
  periods?: Period[];
  groupings?: { key: string; label: string }[];
  run: (period: Period, grouping: string | undefined) => Promise<ReportResult>;
};

export const periodLabels: Record<Period, string> = { today: "Today", "7d": "Last 7 days", month: "This month", all: "Since opening" };

export function periodRange(period: Period) {
  const to = getToday();
  const back = (days: number) => {
    const d = new Date(`${to}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  };
  const from = period === "today" ? to : period === "7d" ? back(6) : period === "month" ? `${to.slice(0, 7)}-01` : OPENING_DATE;
  const label = period === "today" ? formatDate(to) : period === "month" ? formatMonth(to.slice(0, 7)) : `${formatDate(from)} – ${formatDate(to)}`;
  return { from, to, label };
}

const inRange = (date: string, period: Period) => {
  const { from, to } = periodRange(period);
  return date >= from && date <= to;
};

const sumBy = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0);

function groupRows<T>(items: T[], keyOf: (t: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = keyOf(item);
    map.set(k, [...(map.get(k) ?? []), item]);
  }
  return [...map.entries()];
}

export const reports: ReportDef[] = [
  {
    key: "daybook",
    title: "Daybook",
    description: "Every sale, receipt, payment, purchase and expense, in order",
    group: "Money",
    periods: ["today", "7d", "month"],
    async run(period) {
      const [sales, receipts, payments, expenses, purchases] = await Promise.all([getSales(), getReceipts(), getPayments(), getExpenses(), getPurchases()]);
      const rows: ReportRow[] = [
        ...sales.filter((s) => s.status === "saved" && inRange(s.billDate, period)).map((s) => ({ date: s.billDate, type: "Sale", ref: `Bill ${s.billNo}`, detail: s.partyName, in: 0, out: 0, billed: s.total })),
        ...receipts.filter((r) => inRange(r.date, period)).map((r) => ({ date: r.date, type: "Receipt", ref: `Receipt ${r.receiptNo}`, detail: `${r.partyName} · ${paymentModeLabels[r.mode]}`, in: r.amount, out: 0, billed: 0 })),
        ...payments.filter((p) => inRange(p.date, period)).map((p) => ({ date: p.date, type: "Payment", ref: `Payment ${p.paymentNo}`, detail: `${p.partyName} · ${paymentModeLabels[p.mode]}`, in: 0, out: p.amount, billed: 0 })),
        ...expenses.filter((e) => inRange(e.date, period)).map((e) => ({ date: e.date, type: "Expense", ref: `Expense ${e.expenseNo}`, detail: `${expenseHeadLabels[e.head]} · ${e.description}`, in: 0, out: e.amount, billed: 0 })),
        ...purchases.filter((p) => inRange(p.invoiceDate, period)).map((p) => ({ date: p.invoiceDate, type: "Purchase", ref: `Purchase ${p.purchaseNo}`, detail: `${p.companyName} · ${p.invoiceNo}`, in: 0, out: 0, billed: p.total })),
      ].sort((a, b) => String(a.date).localeCompare(String(b.date)));
      return {
        columns: [
          { key: "date", label: "Date", kind: "date" },
          { key: "type", label: "Type" },
          { key: "ref", label: "Entry" },
          { key: "detail", label: "Details" },
          { key: "billed", label: "Billed", kind: "inr" },
          { key: "in", label: "Money in", kind: "inr" },
          { key: "out", label: "Money out", kind: "inr" },
        ],
        rows,
        totals: { detail: "Total", billed: sumBy(rows, (r) => Number(r.billed)), in: sumBy(rows, (r) => Number(r.in)), out: sumBy(rows, (r) => Number(r.out)) },
        note: "Billed = sales and purchases on credit; money in and out = cash and bank movements.",
      };
    },
  },
  {
    key: "sales",
    title: "Sales summary",
    description: "Sales by party, product, staff member or day, with bags and MT",
    group: "Sales",
    periods: ["month", "7d", "today", "all"],
    groupings: [
      { key: "party", label: "By party" },
      { key: "product", label: "By product" },
      { key: "staff", label: "By staff" },
      { key: "day", label: "By day" },
    ],
    async run(period, grouping = "party") {
      const [sales, products, profiles, parties] = await Promise.all([getSales(), getProducts(), getProfiles(), getParties()]);
      const saved = sales.filter((s) => s.status === "saved" && inRange(s.billDate, period));
      const product = (id: string) => products.find((p) => p.id === id)!;
      if (grouping === "product") {
        const lines = saved.flatMap((s) => s.lines);
        const rows = groupRows(lines, (l) => l.productId).map(([id, ls]) => {
          const p = product(id);
          const qty = sumBy(ls, (l) => l.qty);
          return { name: p.name, qty, unit: p.unit === "bag" ? "bags" : "kg", mt: toMT(qty, p.unit), amount: sumBy(ls, (l) => l.qty * l.rate) };
        });
        return {
          columns: [
            { key: "name", label: "Product" },
            { key: "qty", label: "Quantity", kind: "number" },
            { key: "unit", label: "Unit" },
            { key: "mt", label: "MT", kind: "number" },
            { key: "amount", label: "Value", kind: "inr" },
          ],
          rows: rows.sort((a, b) => b.amount - a.amount),
          totals: { name: "Total", mt: sumBy(rows, (r) => r.mt), amount: sumBy(rows, (r) => r.amount) },
        };
      }
      const keyOf = (s: (typeof saved)[number]) =>
        grouping === "staff" ? (parties.find((p) => p.id === s.partyId)?.assignedTo ?? "office") : grouping === "day" ? s.billDate : s.partyName;
      const label = (k: string) => (grouping === "staff" ? (profiles.find((p) => p.id === k)?.fullName ?? "Office") : grouping === "day" ? k : k);
      const rows = groupRows(saved, keyOf).map(([k, bills]) => {
        const lines = bills.flatMap((b) => b.lines);
        const bags = sumBy(lines.filter((l) => product(l.productId).unit === "bag"), (l) => l.qty);
        const kg = sumBy(lines.filter((l) => product(l.productId).unit === "kg"), (l) => l.qty);
        return { name: label(k), bills: bills.length, bags, kg, mt: toMT(bags, "bag") + toMT(kg, "kg"), discount: sumBy(bills, (b) => b.discountAmount), amount: sumBy(bills, (b) => b.total) };
      });
      if (grouping === "day") rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      else rows.sort((a, b) => b.amount - a.amount);
      return {
        columns: [
          { key: "name", label: grouping === "staff" ? "Staff (for their parties)" : grouping === "day" ? "Date" : "Party", kind: grouping === "day" ? "date" : "text" },
          { key: "bills", label: "Bills", kind: "number" },
          { key: "bags", label: "Cement bags", kind: "number" },
          { key: "kg", label: "Steel kg", kind: "number" },
          { key: "mt", label: "Total MT", kind: "number" },
          { key: "discount", label: "Discount", kind: "inr" },
          { key: "amount", label: "Sales", kind: "inr" },
        ],
        rows,
        totals: {
          name: "Total",
          bills: sumBy(rows, (r) => r.bills),
          bags: sumBy(rows, (r) => r.bags),
          kg: sumBy(rows, (r) => r.kg),
          mt: sumBy(rows, (r) => r.mt),
          discount: sumBy(rows, (r) => r.discount),
          amount: sumBy(rows, (r) => r.amount),
        },
      };
    },
  },
  {
    key: "discounts",
    title: "Discounts and rate changes",
    description: "Bills with a discount or a rate below the list rate, and the reason given",
    group: "Sales",
    periods: ["month", "7d", "all"],
    async run(period) {
      const [sales, profiles] = await Promise.all([getSales(), getProfiles()]);
      const rows = sales
        .filter((s) => s.status !== "cancelled" && inRange(s.billDate, period))
        .map((s) => {
          const listValue = sumBy(s.lines, (l) => l.qty * l.listRate);
          const rateGiven = listValue - s.subtotal;
          return { date: s.billDate, bill: `Bill ${s.billNo}`, party: s.partyName, rateGiven, discount: s.discountAmount, total: rateGiven + s.discountAmount, reason: s.overrideReason ?? "", by: profiles.find((p) => p.id === s.createdBy)?.fullName ?? "" };
        })
        .filter((r) => r.total > 0)
        .sort((a, b) => b.date.localeCompare(a.date));
      return {
        columns: [
          { key: "date", label: "Date", kind: "date" },
          { key: "bill", label: "Bill" },
          { key: "party", label: "Party" },
          { key: "rateGiven", label: "Below list rate", kind: "inr" },
          { key: "discount", label: "Discount", kind: "inr" },
          { key: "total", label: "Given away", kind: "inr" },
          { key: "reason", label: "Reason" },
          { key: "by", label: "Entered by" },
        ],
        rows,
        totals: { party: "Total", rateGiven: sumBy(rows, (r) => r.rateGiven), discount: sumBy(rows, (r) => r.discount), total: sumBy(rows, (r) => r.total) },
      };
    },
  },
  {
    key: "outstanding",
    title: "Outstanding and ageing",
    description: "What each party owes, split by how old it is",
    group: "Money",
    async run() {
      const report = await getAgeingReport();
      const parties = await getParties();
      const rows = report.map((r) => ({
        name: r.name,
        place: r.place,
        staff: r.staff ?? "Office",
        limit: parties.find((p) => p.id === r.id)?.creditLimit ?? undefined,
        a: r.ageing["0-7"],
        b: r.ageing["8-30"],
        c: r.ageing["31-60"],
        d: r.ageing["61-90"],
        e: r.ageing["90+"],
        total: r.unpaid,
      }));
      return {
        columns: [
          { key: "name", label: "Party" },
          { key: "place", label: "Place" },
          { key: "staff", label: "Staff" },
          { key: "limit", label: "Credit limit", kind: "inr" },
          { key: "a", label: "0–7 days", kind: "inr" },
          { key: "b", label: "8–30 days", kind: "inr" },
          { key: "c", label: "31–60 days", kind: "inr" },
          { key: "d", label: "61–90 days", kind: "inr" },
          { key: "e", label: "90+ days", kind: "inr" },
          { key: "total", label: "Total", kind: "inr" },
        ],
        rows,
        totals: { name: "Total", a: sumBy(rows, (r) => r.a), b: sumBy(rows, (r) => r.b), c: sumBy(rows, (r) => r.c), d: sumBy(rows, (r) => r.d), e: sumBy(rows, (r) => r.e), total: sumBy(rows, (r) => r.total) },
        note: `As of ${formatDate(getToday())}. Payments clear the oldest bills first.`,
      };
    },
  },
  {
    key: "collections",
    title: "Collections",
    description: "Money received, by staff member or by payment mode",
    group: "Money",
    periods: ["month", "7d", "today", "all"],
    groupings: [
      { key: "staff", label: "By staff" },
      { key: "mode", label: "By mode" },
      { key: "party", label: "By party" },
    ],
    async run(period, grouping = "staff") {
      const [receipts, profiles] = await Promise.all([getReceipts(), getProfiles()]);
      const inPeriod = receipts.filter((r) => inRange(r.date, period));
      const keyOf = (r: (typeof inPeriod)[number]) => (grouping === "mode" ? paymentModeLabels[r.mode] : grouping === "party" ? r.partyName : (profiles.find((p) => p.id === r.collectedBy)?.fullName ?? "Office / bank"));
      const rows = groupRows(inPeriod, keyOf)
        .map(([name, rs]) => ({ name, count: rs.length, cash: sumBy(rs.filter((r) => r.mode === "cash"), (r) => r.amount), other: sumBy(rs.filter((r) => r.mode !== "cash"), (r) => r.amount), amount: sumBy(rs, (r) => r.amount) }))
        .sort((a, b) => b.amount - a.amount);
      return {
        columns: [
          { key: "name", label: grouping === "mode" ? "Mode" : grouping === "party" ? "Party" : "Collected by" },
          { key: "count", label: "Receipts", kind: "number" },
          { key: "cash", label: "Cash", kind: "inr" },
          { key: "other", label: "UPI / bank / cheque", kind: "inr" },
          { key: "amount", label: "Total", kind: "inr" },
        ],
        rows,
        totals: { name: "Total", count: sumBy(rows, (r) => r.count), cash: sumBy(rows, (r) => r.cash), other: sumBy(rows, (r) => r.other), amount: sumBy(rows, (r) => r.amount) },
      };
    },
  },
  {
    key: "expenses",
    title: "Expenses",
    description: "Spending by head, or by the vehicle, staff member or godown it was for",
    group: "Money",
    periods: ["month", "7d", "all"],
    groupings: [
      { key: "head", label: "By head" },
      { key: "tag", label: "By vehicle / staff / godown" },
    ],
    async run(period, grouping = "head") {
      const expenses = (await getExpenses()).filter((e) => inRange(e.date, period));
      const keyOf = (e: (typeof expenses)[number]) => (grouping === "tag" ? (e.tag?.label ?? "General") : expenseHeadLabels[e.head]);
      const rows = groupRows(expenses, keyOf)
        .map(([name, es]) => ({ name, count: es.length, cash: sumBy(es.filter((e) => e.paidFrom === "cash"), (e) => e.amount), bank: sumBy(es.filter((e) => e.paidFrom !== "cash"), (e) => e.amount), amount: sumBy(es, (e) => e.amount) }))
        .sort((a, b) => b.amount - a.amount);
      return {
        columns: [
          { key: "name", label: grouping === "tag" ? "For" : "Head" },
          { key: "count", label: "Entries", kind: "number" },
          { key: "cash", label: "Paid in cash", kind: "inr" },
          { key: "bank", label: "Paid from bank", kind: "inr" },
          { key: "amount", label: "Total", kind: "inr" },
        ],
        rows,
        totals: { name: "Total", count: sumBy(rows, (r) => r.count), cash: sumBy(rows, (r) => r.cash), bank: sumBy(rows, (r) => r.bank), amount: sumBy(rows, (r) => r.amount) },
      };
    },
  },
  {
    key: "stock",
    title: "Stock summary",
    description: "Opening, in, out and closing stock for each godown and product",
    group: "Stock",
    periods: ["month", "7d", "today"],
    async run(period) {
      const [movements, godowns, products] = await Promise.all([getAllStockMovements(), getGodowns(), getProducts()]);
      const { from, to } = periodRange(period);
      const rows = godowns.flatMap((g) =>
        products
          .map((p) => {
            const mine = movements.filter((m) => m.godownId === g.id && m.productId === p.id);
            const before = sumBy(mine.filter((m) => m.date < from), (m) => m.qty);
            const during = mine.filter((m) => m.date >= from && m.date <= to);
            const inward = sumBy(during.filter((m) => m.kind === "inward"), (m) => m.qty);
            const sold = -sumBy(during.filter((m) => m.kind === "sale"), (m) => m.qty) || 0;
            const moved = sumBy(during.filter((m) => m.kind === "transfer" || m.kind === "suspense"), (m) => m.qty);
            const closing = before + inward - sold + moved;
            return { godown: g.name, product: p.name, unit: p.unit === "bag" ? "bags" : "kg", opening: before, inward, sold, moved, closing, mt: toMT(closing, p.unit) };
          })
          .filter((r) => r.opening || r.inward || r.sold || r.moved || r.closing),
      );
      return {
        columns: [
          { key: "godown", label: "Godown" },
          { key: "product", label: "Product" },
          { key: "unit", label: "Unit" },
          { key: "opening", label: "Opening", kind: "number" },
          { key: "inward", label: "In", kind: "number" },
          { key: "sold", label: "Sold", kind: "number" },
          { key: "moved", label: "Transfers / loads", kind: "number" },
          { key: "closing", label: "Closing", kind: "number" },
          { key: "mt", label: "Closing MT", kind: "number" },
        ],
        rows,
        totals: { godown: "Total", mt: sumBy(rows, (r) => r.mt) },
        note: "Lorry stock sold straight off the truck is in Stock → Lorry stock, not here.",
      };
    },
  },
  {
    key: "attendance",
    title: "Attendance",
    description: "This month's present, half days, leave, absent and late for each person",
    group: "People",
    async run() {
      const rows = (await getAttendanceToday()).map((r) => ({
        name: r.name,
        working: r.month.workingDays,
        present: r.month.present,
        half: r.month.halfDay,
        leave: r.month.leave,
        absent: r.month.absent,
        late: r.month.late,
      }));
      return {
        columns: [
          { key: "name", label: "Name" },
          { key: "working", label: "Working days", kind: "number" },
          { key: "present", label: "Present", kind: "number" },
          { key: "half", label: "Half days", kind: "number" },
          { key: "leave", label: "Leave", kind: "number" },
          { key: "absent", label: "Absent", kind: "number" },
          { key: "late", label: "Late", kind: "number" },
        ],
        rows,
        note: `${formatMonth(getToday().slice(0, 7))}, up to ${formatDate(getToday())}. Sundays are the weekly off.`,
      };
    },
  },
  {
    key: "vehicles",
    title: "Vehicle costs",
    description: "Fuel, repairs and freight earned for each vehicle",
    group: "Vehicles",
    periods: ["month", "7d", "all"],
    async run(period) {
      const [vehicles, trips] = await Promise.all([getVehicles(), getTrips()]);
      const rows = vehicles
        .filter((v) => v.category !== "rented")
        .map((v) => {
          const es = v.expenses.filter((e) => inRange(e.date, period));
          const ts = trips.filter((t) => t.vehicleId === v.id && inRange(t.date, period));
          const fuel = sumBy(es.filter((e) => e.head === "fuel"), (e) => e.amount);
          const repairs = sumBy(es.filter((e) => e.head === "vehicle_repair"), (e) => e.amount);
          const other = sumBy(es, (e) => e.amount) - fuel - repairs;
          return { name: v.label, fuel, repairs, other, cost: fuel + repairs + other, trips: ts.length, km: sumBy(ts, (t) => t.km ?? 0), freight: sumBy(ts, (t) => t.freightCharged) };
        });
      return {
        columns: [
          { key: "name", label: "Vehicle" },
          { key: "fuel", label: "Fuel", kind: "inr" },
          { key: "repairs", label: "Repairs", kind: "inr" },
          { key: "other", label: "Other", kind: "inr" },
          { key: "cost", label: "Total cost", kind: "inr" },
          { key: "trips", label: "Trips", kind: "number" },
          { key: "km", label: "Km", kind: "number" },
          { key: "freight", label: "Freight earned", kind: "inr" },
        ],
        rows,
        totals: { name: "Total", fuel: sumBy(rows, (r) => r.fuel), repairs: sumBy(rows, (r) => r.repairs), other: sumBy(rows, (r) => r.other), cost: sumBy(rows, (r) => r.cost), trips: sumBy(rows, (r) => r.trips), km: sumBy(rows, (r) => r.km), freight: sumBy(rows, (r) => r.freight) },
        note: "Trips cover the last two weeks of sample data.",
      };
    },
  },
  {
    key: "activity",
    title: "Activity log",
    description: "Who entered what and when, across bills, receipts, expenses and orders",
    group: "Activity",
    periods: ["today", "7d", "month"],
    async run(period) {
      const [sales, receipts, expenses, orders, profiles] = await Promise.all([getSales(), getReceipts(), getExpenses(), getOrders(), getProfiles()]);
      const name = (id?: string) => profiles.find((p) => p.id === id)?.fullName ?? "Office";
      const rows: ReportRow[] = [
        ...sales.filter((s) => inRange(s.billDate, period)).map((s) => ({ date: s.billDate, who: name(s.createdBy), action: s.status === "cancelled" ? "Cancelled bill" : s.status === "pending_approval" ? "Bill sent for approval" : "Made bill", detail: `Bill ${s.billNo} · ${s.partyName}${s.overrideReason ? ` · reason: ${s.overrideReason}` : ""}`, amount: s.total })),
        ...receipts.filter((r) => inRange(r.date, period)).map((r) => ({ date: r.date, who: name(r.collectedBy), action: "Recorded receipt", detail: `Receipt ${r.receiptNo} · ${r.partyName}`, amount: r.amount })),
        ...expenses.filter((e) => inRange(e.date, period)).map((e) => ({ date: e.date, who: e.paidBy && e.paidBy !== "office" ? name(e.paidBy) : "Office", action: "Added expense", detail: e.description, amount: e.amount })),
        ...orders.filter((o) => inRange(o.date, period)).map((o) => ({ date: o.date, who: o.takenByName, action: "Took order", detail: `Order ${o.orderNo} · ${o.partyName}`, amount: undefined })),
      ].sort((a, b) => String(b.date).localeCompare(String(a.date)));
      return {
        columns: [
          { key: "date", label: "Date", kind: "date" },
          { key: "who", label: "Who" },
          { key: "action", label: "What" },
          { key: "detail", label: "Details" },
          { key: "amount", label: "Amount", kind: "inr" },
        ],
        rows,
        note: "With the database connected this comes from the audit log, including edits with old and new values.",
      };
    },
  },
];

export function findReport(key: string) {
  return reports.find((r) => r.key === key);
}

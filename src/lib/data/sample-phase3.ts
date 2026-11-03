/**
 * Sample data for phase 3 screens: employees, attendance, tour visits, targets, salary and loans,
 * orders and today's deliveries. Built on sample.ts so orders point at real sample bills.
 */
import { withLocalEmployees } from "./local-data";
import { addDays, dateShifter, mulberry32, parties, salaryPayday, sampleProfiles, type SampleBook } from "./sample";
import { shiftMonth } from "@/lib/format";
import { vehicleNames } from "./sample-phase2";
import type { AttendanceRecord, Delivery, EmployeeDetails, Loan, Order, SalarySlip, StaffTarget, TourVisit } from "./types";

const isSunday = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay() === 0;
const time = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const sampleEmployees = (): EmployeeDetails[] => [
  { profileId: "u-office", designation: "Accounts and billing", joinedOn: "2021-06-01", monthlySalary: 18000, areas: ["Office"] },
  { profileId: "u-godown", designation: "Godown in-charge, Polaki", joinedOn: "2019-03-15", monthlySalary: 16000, areas: ["Polaki godown"] },
  { profileId: "u-ramana", designation: "Sales and collections", joinedOn: "2022-08-01", monthlySalary: 15000, areas: ["Tekkali", "Kotabommali", "Ponduru"] },
  { profileId: "u-venkatesh", designation: "Sales and collections", joinedOn: "2020-01-10", monthlySalary: 15000, areas: ["Narasannapeta", "Amadalavalasa", "Palasa"] },
  { profileId: "u-driver", designation: "Driver", joinedOn: "2023-02-20", monthlySalary: 14000, areas: ["Deliveries"], vehicle: vehicleNames[1] },
];

/** The sample staff's records, or the real staff's (local-data/staff.json) with their own designations. */
export let employees: EmployeeDetails[];

/** Builds the employees again from the records: when the server starts, and whenever they change. */
export function loadPhase3() {
  employees = withLocalEmployees(sampleEmployees(), sampleProfiles);
}

loadPhase3();

/** Attendance, tour visits, targets, loans, salary, orders and today's deliveries, for the same today as `book`. */
export function buildPhase3(book: SampleBook) {
  const { SAMPLE_TODAY, sales } = book;
  const at = dateShifter(SAMPLE_TODAY);
  const thisMonth = SAMPLE_TODAY.slice(0, 7);
  const payday = salaryPayday(SAMPLE_TODAY);
  const rand = mulberry32(303);
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];
  const between = (min: number, max: number, step = 1) => min + Math.floor((rand() * (max - min)) / step + 0.5) * step;

  // ── Attendance: from the first unpaid month to today. Sundays are the weekly off. ─

  const attendance: AttendanceRecord[] = [];
  const workplace: Record<string, string[]> = {
    "u-office": ["Polaki office"],
    "u-godown": ["Polaki godown"],
    "u-ramana": ["Tekkali", "Kotabommali", "Ponduru"],
    "u-venkatesh": ["Narasannapeta", "Amadalavalasa", "Palasa"],
    "u-driver": ["Polaki godown"],
  };
  for (let day = `${shiftMonth(payday.month, 1)}-01`; day <= SAMPLE_TODAY; day = addDays(day, 1)) {
    for (const e of employees) {
      if (isSunday(day)) {
        attendance.push({ profileId: e.profileId, date: day, status: "holiday" });
        continue;
      }
      const roll = rand();
      const status = day === SAMPLE_TODAY ? "present" : roll < 0.86 ? "present" : roll < 0.91 ? "half_day" : roll < 0.96 ? "leave" : "absent";
      if (status === "leave" || status === "absent") {
        attendance.push({ profileId: e.profileId, date: day, status });
        continue;
      }
      const start = e.profileId === "u-driver" ? 8 * 60 + 30 : 9 * 60;
      const inAt = start + between(-12, 32);
      const outAt = status === "half_day" ? 13 * 60 + between(0, 40) : 18 * 60 + between(0, 90);
      attendance.push({
        profileId: e.profileId,
        date: day,
        status,
        checkIn: time(inAt),
        // Nobody has checked out yet today.
        checkOut: day === SAMPLE_TODAY ? undefined : time(outAt),
        location: pick(workplace[e.profileId] ?? e.areas),
        late: inAt > start + 15,
      });
    }
  }
  // One corrected record, so the audit note shows up.
  {
    const r = attendance.find((a) => a.profileId === "u-godown" && a.status === "absent") ?? attendance.find((a) => a.profileId === "u-godown" && a.status === "leave");
    if (r) {
      r.status = "present";
      r.checkIn = "09:05";
      r.checkOut = "18:20";
      r.location = "Polaki godown";
      r.correctedBy = "u-owner";
      r.correctionReason = "Phone battery died; was at the godown all day";
    }
  }

  // ── Tour visits: last week, this week and next week for field staff ────────

  const visits: TourVisit[] = [];
  let visitNo = 1;
  const outcomes = {
    collection: ["Collected part payment", "Promised payment on Friday", "Cheque to be ready next week", "Collected full balance"],
    order: ["Order for 200 bags OPC", "Order for 2 MT TMT 12 mm", "Will confirm rates tomorrow", "Order for 120 bags PPC"],
    new_party: ["Interested; wants rate list", "Building a house; needs 600 bags", "Not interested now"],
    complaint: ["Torn bags replaced", "Short delivery noted; office to check"],
  };
  for (let day = addDays(SAMPLE_TODAY, -7); day <= addDays(SAMPLE_TODAY, 6); day = addDays(day, 1)) {
    if (isSunday(day)) continue;
    for (const staff of ["u-ramana", "u-venkatesh"]) {
      const mine = parties.filter((p) => p.assignedTo === staff);
      const count = between(2, 4);
      for (let i = 0; i < count; i++) {
        const purpose = rand() < 0.45 ? "collection" : rand() < 0.7 ? "order" : rand() < 0.85 ? "new_party" : "complaint";
        const party = purpose === "new_party" ? undefined : pick(mine);
        const place = party?.place ?? pick(workplace[staff] ?? ["Polaki"]);
        const past = day < SAMPLE_TODAY || (day === SAMPLE_TODAY && i === 0);
        const roll = rand();
        const status = past ? (roll < 0.78 ? "completed" : roll < 0.9 ? "postponed" : "cancelled") : "planned";
        visits.push({
          id: `v-${visitNo++}`,
          profileId: staff,
          date: day,
          partyId: party?.id,
          prospect: party ? undefined : pick(["Site at Saravakota (house)", "New hardware shop, bus stand", "School building contractor"]),
          place,
          purpose,
          status,
          outcome: status === "completed" ? pick(outcomes[purpose]) : status === "postponed" ? "Party not available" : undefined,
          nextAction: status === "completed" && rand() < 0.4 ? "Follow up next visit" : undefined,
        });
      }
    }
  }

  // ── Targets for this month ───────────────────────────────────────────────────

  const targets: StaffTarget[] = [
    { profileId: "u-ramana", month: thisMonth, sales: 1200000, collections: 900000 },
    { profileId: "u-venkatesh", month: thisMonth, sales: 1500000, collections: 1100000 },
  ];

  // ── Salary and loans ─────────────────────────────────────────────────────────

  const loans: Loan[] = [
    {
      id: "loan-1",
      profileId: "u-driver",
      kind: "loan",
      amount: 30000,
      date: at("2026-09-20"),
      emi: 3000,
      repayments: [],
      note: "Family medical expense",
    },
    {
      id: "loan-2",
      profileId: "u-ramana",
      kind: "advance",
      amount: 10000,
      date: at("2026-09-22"),
      emi: 2500,
      repayments: [],
      note: "Salary advance for festival",
    },
    {
      id: "loan-3",
      profileId: "u-venkatesh",
      kind: "loan",
      amount: 20000,
      date: at("2026-01-10"),
      emi: 4000,
      repayments: [at("2026-02-05"), at("2026-03-05"), at("2026-04-05"), at("2026-05-05"), at("2026-06-05")].map((date) => ({ date, amount: 4000, via: "salary" as const })),
      note: "Two-wheeler repair",
    },
  ];

  /** The last paid month (paid on the 5th, matching the salary expenses); later months are worked out from attendance. */
  function salarySlips(): SalarySlip[] {
    const slips: SalarySlip[] = [];
    for (const e of employees) {
      slips.push({ profileId: e.profileId, month: payday.month, gross: e.monthlySalary, absenceDeduction: 0, loanDeduction: 0, net: e.monthlySalary, paidOn: payday.on });
      for (let month = shiftMonth(payday.month, 1); month <= thisMonth; month = shiftMonth(month, 1)) {
        const days = attendance.filter((a) => a.profileId === e.profileId && a.date.startsWith(month));
        const unpaidDays = days.filter((a) => a.status === "absent").length + days.filter((a) => a.status === "half_day").length * 0.5;
        const perDay = e.monthlySalary / 26;
        const absenceDeduction = Math.round(unpaidDays * perDay);
        const loanDeduction = loans.filter((l) => l.profileId === e.profileId && l.amount > l.repayments.reduce((s, r) => s + r.amount, 0)).reduce((s, l) => s + l.emi, 0);
        slips.push({
          profileId: e.profileId,
          month,
          gross: e.monthlySalary,
          absenceDeduction,
          loanDeduction,
          net: e.monthlySalary - absenceDeduction - loanDeduction,
        });
      }
    }
    return slips;
  }

  // ── Orders ───────────────────────────────────────────────────────────────────

  const orders: Order[] = [];
  let orderNo = 4101;
  const customers = parties.filter((p) => p.kind === "customer" || p.kind === "sub_dealer");

  // Dispatched orders point at real sample bills from the last week.
  sales
    .filter((s) => s.status === "saved" && s.partyId !== "cash" && s.billDate >= addDays(SAMPLE_TODAY, -8))
    .slice(0, 7)
    .forEach((s, i) => {
      const party = parties.find((p) => p.id === s.partyId)!;
      const partly = i === 1 || i === 4;
      orders.push({
        id: `ord-${orderNo}`,
        orderNo: orderNo++,
        partyId: s.partyId,
        date: addDays(s.billDate, -between(0, 2)),
        source: party.assignedTo ? "staff" : rand() < 0.5 ? "phone" : "sub_dealer",
        takenBy: party.assignedTo ?? "u-office",
        deliverBy: s.billDate,
        destination: party.place,
        godownId: s.godownId,
        lines: s.lines.map((l) => ({ productId: l.productId, qty: partly ? l.qty + (l.productId.includes("deccan") ? 100 : 1000) : l.qty })),
        saleIds: [s.id],
        status: partly ? "partly_dispatched" : "dispatched",
      });
    });

  const openOrder = (status: Order["status"], date: string, remarks?: string) => {
    const party = pick(customers);
    const cement = rand() < 0.75;
    orders.push({
      id: `ord-${orderNo}`,
      orderNo: orderNo++,
      partyId: party.id,
      date,
      source: party.assignedTo ? "staff" : pick(["phone", "sub_dealer"] as const),
      takenBy: party.assignedTo ?? "u-office",
      deliverBy: addDays(date, between(0, 3)),
      destination: party.place,
      godownId: rand() < 0.75 ? "g-polaki" : "g-srikakulam",
      lines: cement
        ? [{ productId: pick(["p-deccan-opc", "p-deccan-ppc"]), qty: between(50, 300, 10) }]
        : [{ productId: pick(["p-tmt-8", "p-tmt-12", "p-ms-vishaka"]), qty: between(1000, 4000, 500) }],
      saleIds: [],
      status,
      remarks,
    });
  };
  openOrder("confirmed", addDays(SAMPLE_TODAY, -2), "Deliver before 10 am");
  openOrder("confirmed", addDays(SAMPLE_TODAY, -1));
  openOrder("confirmed", addDays(SAMPLE_TODAY, -1), "Unloading by party's own labour");
  openOrder("new", SAMPLE_TODAY, "Rate to be confirmed by owner");
  openOrder("new", SAMPLE_TODAY);
  openOrder("new", SAMPLE_TODAY, "Ordered on WhatsApp");
  openOrder("cancelled", addDays(SAMPLE_TODAY, -4), "Party bought from another dealer");
  orders.sort((a, b) => b.date.localeCompare(a.date) || b.orderNo - a.orderNo);

  // ── Today's deliveries (the driver's home screen) ────────────────────────────

  const deliveries: Delivery[] = sales
    .filter((s) => s.billDate === SAMPLE_TODAY && s.status === "saved" && s.transportMode === "FOR")
    .map((s, i) => ({
      id: `del-${s.billNo}`,
      saleId: s.id,
      date: SAMPLE_TODAY,
      vehicle: vehicleNames[1],
      driverId: "u-driver",
      status: i === 0 ? "delivered" : i === 1 ? "on_the_way" : "loaded",
      time: i === 0 ? "10:40" : i === 1 ? "12:15" : undefined,
    }));

  return { attendance, visits, targets, loans, salarySlips, orders, deliveries };
}

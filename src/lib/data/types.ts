/**
 * App-side shapes of the database tables in supabase/migrations.
 * Screens only ever see these types, so swapping sample data for Supabase queries changes src/lib/data only.
 */
import type { TransportMode, Unit } from "@/lib/sales";

export type Role = "owner" | "office" | "godown" | "field" | "driver";
export type PartyKind = "cash" | "customer" | "sub_dealer" | "company" | "lorry_owner";
export type PaymentMode = "cash" | "upi" | "cheque" | "neft";
export type SaleStatus = "saved" | "pending_approval" | "cancelled";
export type StockSource = "godown" | "lorry" | "van";

export type Firm = {
  id: string;
  name: string;
  gstin: string;
  address: string;
  phone: string;
  /** The one firm sales are billed from; purchases can be in any firm. */
  primary: boolean;
};
export type Godown = {
  id: string;
  name: string;
  place: string;
  /** Our own godown; the others are the cement companies' godowns where our stock is kept. */
  own?: boolean;
  /** Profile ids of the staff who look after it. */
  inCharge?: string[];
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  /** The type within the brand, e.g. OPC, PPC, TMT 8 mm. */
  variant?: string;
  category: "cement" | "steel";
  unit: Unit;
  listRate: number;
  active: boolean;
};

export type Profile = {
  id: string;
  fullName: string;
  initials: string;
  mobile: string;
  /** Optional; they can sign in with this instead of their mobile number. */
  email?: string;
  role: Role;
  active: boolean;
};

export type Party = {
  id: string;
  name: string;
  kind: PartyKind;
  place?: string;
  mobile?: string;
  email?: string;
  gstin?: string;
  /** Null = no credit (walk-in cash customer, or a supplier). */
  creditLimit: number | null;
  /** Signed: positive = they owe us (Dr), negative = we owe them (Cr). */
  openingBalance: number;
  assignedTo?: string;
  /** For a supplier: the brands it sells, so a purchase from it offers only those. */
  brands?: string[];
};

export type SaleLine = { productId: string; qty: number; rate: number; listRate: number };

export type Sale = {
  id: string;
  /** Which of the owner's firms the bill is under; the main (first) firm when missing. */
  firmId?: string;
  billNo: number;
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
  paperMemo?: string;
  remarks?: string;
  status: SaleStatus;
  overrideReason?: string;
  createdBy: string;
  lines: SaleLine[];
};

export type Receipt = {
  id: string;
  receiptNo: number;
  partyId: string;
  date: string;
  amount: number;
  mode: PaymentMode;
  reference?: string;
  collectedBy?: string;
  remarks?: string;
};

/** Money we pay out to a supplier company or lorry owner. */
export type Payment = {
  id: string;
  paymentNo: number;
  partyId: string;
  date: string;
  amount: number;
  mode: PaymentMode;
  reference?: string;
  remarks?: string;
};

export type Purchase = {
  id: string;
  /** Which of the owner's firms bought it; the primary firm when missing. */
  firmId?: string;
  purchaseNo: number;
  companyId: string;
  invoiceNo: string;
  invoiceDate: string;
  receivedDate: string;
  lorryNo: string;
  /** Empty when the load stays on the lorry and is sold from there (see onLorry). */
  godownId: string;
  /** Sold straight off the lorry without unloading into a godown. */
  onLorry?: boolean;
  /** Noted when a lorry is sold from (Sales › Lorry sales › Lorry arrived). */
  driverName?: string;
  /** The physical invoice paper is kept with us. */
  invoicePaperKept?: boolean;
  /** Unloading is charged for this lorry. */
  unloadingCharges?: boolean;
  /** Expected to sell out in about this many days. */
  sellOutDays?: number;
  lines: { productId: string; qty: number; rate: number }[];
  freight: number;
  total: number;
};

export type QuotationStatus = "draft" | "sent" | "accepted" | "expired";

export type Quotation = {
  id: string;
  quoteNo: string;
  date: string;
  clientName: string;
  clientGstin?: string;
  site?: string;
  contact?: string;
  email?: string;
  lines: { productId: string; description: string; qty: number; qtyLabel: string; rate: number }[];
  terms: string[];
  status: QuotationStatus;
};

export type LedgerEntry = {
  date: string;
  kind: "opening" | "sale" | "receipt" | "purchase" | "payment" | "writeoff";
  ref: string;
  href?: string;
  narration: string;
  debit: number;
  credit: number;
  /** Running balance after this entry; positive = Dr. */
  balance: number;
};

export type StockMovement = {
  id: string;
  date: string;
  productId: string;
  godownId: string;
  qty: number;
  /** "inward": stock that came in on a purchase. */
  kind: "opening" | "inward" | "sale" | "transfer" | "suspense";
  ref: string;
};

export type Ageing = { "0-7": number; "8-30": number; "31-60": number; "61-90": number; "90+": number };

// ── Phase 2: money ───────────────────────────────────────────────────────────

/** "office" is the office cash box; anything else is a profile id. */
export type CashHolder = string;

export type CashHandover = { id: string; date: string; from: CashHolder; to: CashHolder; amount: number; note?: string };

/** What a staff member physically counted at day end, compared with the expected closing. */
export type CashCount = { holder: CashHolder; date: string; counted: number };

export type ExpenseHead =
  | "rent"
  | "salary"
  | "driver"
  | "fuel"
  | "loading"
  | "vehicle_repair"
  | "electricity"
  | "office"
  | "other";

export type Expense = {
  id: string;
  expenseNo: number;
  date: string;
  head: ExpenseHead;
  amount: number;
  /** "cash" = from someone's cash in hand (paidBy); otherwise a bank account id. */
  paidFrom: "cash" | string;
  paidBy?: CashHolder;
  tag?: { kind: "vehicle" | "employee" | "godown"; label: string };
  description: string;
  hasPhoto: boolean;
};

export type CommitmentKind = "fixed_price" | "advance";

/** Customer advance; a fixed-price commitment also locks a rate for a number of bags. */
export type Commitment = {
  id: string;
  partyId: string;
  kind: CommitmentKind;
  productId?: string;
  rate?: number;
  bags?: number;
  amount: number;
  date: string;
  mode: PaymentMode;
  terms?: string;
  receiptId: string;
};

export type BadDebt = { id: string; partyId: string; date: string; amount: number; reason: string; approvedBy: string };

export type BankAccount = {
  id: string;
  bank: string;
  name: string;
  accountNo: string;
  scope: "business" | "personal";
  openingBalance: number;
  /** Which of the owner's firms the account belongs to (business accounts). */
  firmId?: string;
  ifsc?: string;
  branch?: string;
};

export type BankEntry = {
  id: string;
  accountId: string;
  date: string;
  /** Positive = money in, negative = money out. */
  amount: number;
  description: string;
  href?: string;
  /** UTR, cheque number or bank transaction id. */
  ref?: string;
  /** Read from a bank statement, or added by hand on the bank page. */
  source?: "statement" | "manual";
};

export type Reminder = {
  id: string;
  partyId: string;
  date: string;
  channel: "whatsapp" | "sms";
  amount: number;
  status: "delivered" | "read" | "failed";
};

// ── Phase 2: personal (owner only) ───────────────────────────────────────────

export type Chit = {
  id: string;
  organiser: string;
  chitNo: string;
  scope: "business" | "personal";
  totalValue: number;
  months: number;
  instalment: number;
  startDate: string;
  dueDay: number;
  paidMonths: number;
  lifted?: { month: number; amount: number; date: string };
};

export type Rental = {
  id: string;
  property: string;
  direction: "received" | "paid";
  counterparty: string;
  monthlyRent: number;
  advance: number;
  dueDay: number;
  agreementEnd: string;
  /** Last month fully paid, "YYYY-MM". */
  paidThrough: string;
  scope: "business" | "personal";
};

export type InsurancePolicy = {
  id: string;
  kind: "life" | "health" | "vehicle" | "property";
  title: string;
  insurer: string;
  policyNo: string;
  premium: number;
  frequency: "yearly" | "half-yearly" | "monthly";
  nextDue: string;
  sumAssured: number;
};

export type Note = { id: string; title: string; body: string; pinned: boolean; remindOn?: string };

export type VaultDocument = { id: string; title: string; kind: string; fileName: string; expires?: string; addedOn: string };

// ── Phase 3: field team and orders ───────────────────────────────────────────

export type EmployeeDetails = {
  profileId: string;
  designation: string;
  joinedOn: string;
  monthlySalary: number;
  areas: string[];
  vehicle?: string;
};

export type AttendanceStatus = "present" | "half_day" | "leave" | "absent" | "holiday";

export type AttendanceRecord = {
  profileId: string;
  date: string;
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  location?: string;
  late?: boolean;
  correctedBy?: string;
  correctionReason?: string;
};

export type VisitPurpose = "collection" | "order" | "new_party" | "complaint";
export type VisitStatus = "planned" | "completed" | "postponed" | "cancelled";

export type TourVisit = {
  id: string;
  profileId: string;
  date: string;
  /** Existing party, or a prospect name for a new-party visit. */
  partyId?: string;
  prospect?: string;
  place: string;
  purpose: VisitPurpose;
  status: VisitStatus;
  outcome?: string;
  nextAction?: string;
};

export type StaffTarget = { profileId: string; month: string; sales: number; collections: number };

export type Loan = {
  id: string;
  profileId: string;
  kind: "loan" | "advance";
  amount: number;
  date: string;
  emi: number;
  repayments: { date: string; amount: number; via: "salary" | "cash" }[];
  note?: string;
};

export type SalarySlip = {
  profileId: string;
  month: string;
  gross: number;
  absenceDeduction: number;
  loanDeduction: number;
  net: number;
  paidOn?: string;
};

export type OrderStatus = "new" | "confirmed" | "partly_dispatched" | "dispatched" | "cancelled";

export type Order = {
  id: string;
  orderNo: number;
  partyId: string;
  date: string;
  source: "staff" | "phone" | "sub_dealer";
  takenBy: string;
  deliverBy?: string;
  destination?: string;
  lines: { productId: string; qty: number }[];
  /** Bills raised against this order, in the order they were dispatched. */
  saleIds: string[];
  status: OrderStatus;
  remarks?: string;
};

// ── Phase 4: stock movement and fleet ────────────────────────────────────────

export type StockTransfer = {
  id: string;
  transferNo: number;
  date: string;
  from: string;
  to: string;
  vehicle: string;
  lines: { productId: string; qty: number }[];
  status: "in_transit" | "received";
  receivedOn?: string;
  note?: string;
};

/** Load sent out before the buyer is known; assigned to a party (and billed) later. */
export type SuspenseLoad = {
  id: string;
  date: string;
  godownId: string;
  vehicle: string;
  productId: string;
  qty: number;
  note: string;
  assigned?: { partyId: string; saleId?: string; date: string };
};

export type VehicleKind = "van" | "lorry" | "car" | "bike";

export type Vehicle = {
  id: string;
  number: string;
  kind: VehicleKind;
  /** Own (FOR deliveries), kept at a godown, or rented from a lorry owner. */
  category: "own" | "godown" | "rented";
  model: string;
  capacityMT?: number;
  driverId?: string;
  ownerPartyId?: string;
  odometer: number;
  nextServiceKm: number;
  documents: { insurance?: string; tax?: string; pollution?: string; fitness?: string; permit?: string };
  tyresChangedOn?: string;
  gps?: { lat: number; lng: number; updatedAt: string; status: "moving" | "stopped" | "offline"; speedKmh: number; place: string };
};

export type ServiceRecord = {
  id: string;
  vehicleId: string;
  date: string;
  kind: "service" | "oil" | "tyres" | "brakes" | "battery" | "repair";
  odometer: number;
  cost: number;
  garage: string;
  notes?: string;
};

export type FreightRate = { id: string; place: string; distanceKm: number; perBag: number; perMT: number; minimum: number; lat: number; lng: number };

export type Trip = {
  id: string;
  date: string;
  vehicleId: string;
  driverId?: string;
  saleIds: string[];
  startKm: number;
  endKm?: number;
  status: "planned" | "on_the_way" | "completed";
};

export type Delivery = {
  id: string;
  saleId: string;
  date: string;
  vehicle: string;
  driverId: string;
  status: "loaded" | "on_the_way" | "delivered";
  time?: string;
};

// ── Phase 5: reminder messages ───────────────────────────────────────────────

export type ReminderTemplate = {
  id: string;
  name: string;
  /** When the scheduler uses it. */
  stage: "first" | "repeat" | "final" | "thanks";
  channel: "whatsapp" | "sms";
  language: "en" | "te";
  body: string;
  active: boolean;
};

export type ReminderRules = {
  firstAfterDays: number;
  repeatEveryDays: number;
  stopAfter: number;
  sendAt: string;
  skipSundays: boolean;
  smsIfWhatsappFails: boolean;
  /** Parties owing less than this are not reminded. */
  minimumAmount: number;
};

import type { ChipTone } from "@/components/ui/chip";
import type { ExpenseHead, OrderStatus, PartyKind, PaymentMode, QuotationStatus, Role, SaleStatus } from "@/lib/data/types";
import type { TransportMode } from "@/lib/sales";

export const roleLabels: Record<Role, string> = {
  owner: "Owner",
  office: "Office / accounts",
  godown: "Godown in-charge",
  field: "Sales & collection",
  driver: "Driver",
};

export const allRoles = Object.keys(roleLabels) as Role[];

export const partyKindLabels: Record<PartyKind, string> = {
  cash: "Cash",
  customer: "Customer",
  sub_dealer: "Sub-dealer",
  company: "Supplier company",
  lorry_owner: "Lorry owner",
};

export const paymentModeLabels: Record<PaymentMode, string> = {
  cash: "Cash",
  upi: "UPI",
  cheque: "Cheque",
  neft: "NEFT",
};

export const transportLabels: Record<TransportMode, string> = {
  FOR: "FOR · our lorry",
  EX: "EX · customer's vehicle",
  RENT: "Rent · hired vehicle",
};

/** "Bill #1234", or "Sale request" while the sale waits for the owner to give it a bill no. and prices. */
export const billName = (sale: { billNo?: number }) => (sale.billNo ? `Bill #${sale.billNo}` : "Sale request");

export const saleStatus: Record<SaleStatus, { label: string; tone: ChipTone }> = {
  saved: { label: "Saved", tone: "good" },
  pending_approval: { label: "Waiting approval", tone: "warning" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

/** Fixed expense heads from the client's list (rents, driver amounts, salaries…). */
export const expenseHeadLabels: Record<ExpenseHead, string> = {
  rent: "Rent",
  salary: "Salary",
  driver: "Driver payment",
  fuel: "Fuel",
  loading: "Loading / unloading",
  vehicle_repair: "Vehicle repair",
  electricity: "Electricity",
  office: "Office",
  other: "Other",
};

export const orderStatus: Record<OrderStatus, { label: string; tone: ChipTone }> = {
  new: { label: "New", tone: "accent" },
  confirmed: { label: "Confirmed", tone: "warning" },
  partly_dispatched: { label: "Part sent", tone: "warning" },
  dispatched: { label: "Dispatched", tone: "good" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const orderSourceLabels = { staff: "By staff", phone: "By phone", sub_dealer: "Sub-dealer app" } as const;

export const quotationStatus: Record<QuotationStatus, { label: string; tone: ChipTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "accent" },
  accepted: { label: "Accepted", tone: "good" },
  expired: { label: "Expired", tone: "danger" },
};

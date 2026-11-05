/**
 * Sale calculations from the "Business rules and calculations" section of the project plan.
 * Pure functions, shared by the New sale screen and (later) the server.
 */

export type Unit = "bag" | "kg" | "piece" | "unit" | "box" | "bundle" | "metre" | "litre" | string;
export type DiscountMode = "amount" | "percent";
/** FOR = our own vehicle (transport charged), EX = the customer's own vehicle (no charges), RENT = a rented vehicle (rent charged). */
export type TransportMode = "FOR" | "EX" | "RENT";

/** 20 bags of cement = 1 MT; 1000 kg of steel = 1 MT. 0 if MT does not apply. */
export function toMT(qty: number, unit: Unit): number {
  if (unit === "bag") return qty / 20;
  if (unit === "kg") return qty / 1000;
  if (unit === "ton" || unit === "mt") return qty;
  if (unit === "qtl") return qty / 10;
  return 0;
}

export const unitLabel: Record<string, string> = {
  bag: "bags",
  kg: "kg",
  bar: "bars",
  rod: "rods",
  piece: "pieces",
  unit: "units",
  box: "boxes",
  bundle: "bundles",
  metre: "metres",
  meter: "meters",
  litre: "litres",
  liter: "liters",
  ton: "tonnes",
  mt: "MT",
  qtl: "quintals",
  sqft: "sq.ft",
  load: "loads",
  packet: "packets",
  drum: "drums",
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export type SaleInput = {
  lines: { qty: number; rate: number }[];
  discountMode: DiscountMode;
  discountValue: number;
  transportMode: TransportMode;
  transportCharge: number;
  unloadingCharge: number;
  otherCharge: number;
};

export type SaleTotals = {
  subtotal: number;
  discount: number;
  discountPercent: number;
  transport: number;
  charges: number;
  total: number;
};

/** total = Σ(qty × rate) − discount + transport + unloading + other. */
export function computeTotals(input: SaleInput): SaleTotals {
  const subtotal = round2(input.lines.reduce((sum, l) => sum + safe(l.qty) * safe(l.rate), 0));
  const rawDiscount =
    input.discountMode === "percent" ? (subtotal * safe(input.discountValue)) / 100 : safe(input.discountValue);
  const discount = round2(Math.min(Math.max(rawDiscount, 0), subtotal));
  const transport = input.transportMode === "EX" ? 0 : safe(input.transportCharge);
  const charges = round2(transport + safe(input.unloadingCharge) + safe(input.otherCharge));
  return {
    subtotal,
    discount,
    discountPercent: subtotal > 0 ? round2((discount / subtotal) * 100) : 0,
    transport,
    charges,
    total: round2(subtotal - discount + charges),
  };
}

export type CreditCheck = {
  limit: number;
  outstanding: number;
  available: number;
  afterSale: number;
  over: number;
  overLimit: boolean;
};

/** Outstanding + this bill compared with the party's limit; null for the cash customer (no credit). */
export function checkCredit(limit: number | null, outstanding: number, billTotal: number): CreditCheck | null {
  if (limit === null) return null;
  const afterSale = round2(outstanding + billTotal);
  return {
    limit,
    outstanding,
    available: round2(limit - outstanding),
    afterSale,
    over: round2(Math.max(0, afterSale - limit)),
    overLimit: afterSale > limit,
  };
}

/** Proposed default from the questionnaire: staff 1%, office 2%, owner any. */
export const maxDiscountPercent = { owner: Infinity, office: 2, field: 1, godown: 0, driver: 0 } as const;

function safe(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

"use server";

import { addCustomer, getCurrentUser, getParties } from "@/lib/data";
import type { SaleParty } from "./new-sale-form";

export type NewCustomerInput = { name: string; mobile: string; place: string; kind: "customer" | "sub_dealer" };
export type NewCustomerResult = { ok: true; party: SaleParty } | { ok: false; problem: string; existing?: SaleParty };

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const toSaleParty = (p: { id: string; name: string; place?: string; kind: SaleParty["kind"]; creditLimit: number | null; balance: number; mobile?: string }): SaleParty => ({
  id: p.id,
  name: p.name,
  place: p.place,
  kind: p.kind,
  creditLimit: p.creditLimit,
  outstanding: Math.max(p.balance, 0),
  mobile: p.mobile,
});

/** New sale › New customer: saves the customer (or sub-dealer) so the bill can be made for them straight away. */
export async function createCustomer(input: NewCustomerInput): Promise<NewCustomerResult> {
  const user = await getCurrentUser();
  if (user.role !== "owner" && user.role !== "office" && user.role !== "field") return { ok: false, problem: "Only sales staff can add customers." };

  const name = text(input?.name).replace(/\s+/g, " ");
  const mobile = text(input?.mobile).replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  const place = text(input?.place);
  const kind = input?.kind === "sub_dealer" ? "sub_dealer" : "customer";
  if (name.length < 2 || name.length > 80) return { ok: false, problem: "Enter the customer's name." };
  if (mobile.length !== 10) return { ok: false, problem: "Enter a 10-digit mobile number." };
  if (place.length > 60) return { ok: false, problem: "That place name is too long." };

  const same = (await getParties()).find((p) => p.mobile === mobile);
  if (same) return { ok: false, problem: `${same.name} already has this mobile number.`, existing: toSaleParty(same) };

  return { ok: true, party: toSaleParty(await addCustomer({ name, mobile, place, kind })) };
}

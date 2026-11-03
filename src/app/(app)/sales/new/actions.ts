"use server";

import { addCustomer, addDestination, addRentDriver, getCurrentUser, getParties } from "@/lib/data";
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

type AddResult = { ok: true; name: string; added: boolean } | { ok: false; problem: string };

/** A name typed into an "Add …" box: spaces tidied and each word capitalised; null when it isn't a sensible name. */
function cleanName(input: string) {
  const name = text(input)
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
  return name.length >= 2 && name.length <= 40 && /^[\p{L}\d .,'()&-]+$/u.test(name) ? name : null;
}

/** New sale › Destination › Add destination: a village or town, saved for everyone. */
export async function createDestination(input: string): Promise<AddResult> {
  await getCurrentUser();
  const name = cleanName(input);
  if (!name) return { ok: false, problem: "Enter the village or town name (letters and numbers only)." };
  return { ok: true, ...(await addDestination(name)) };
}

/** New sale › Rent › Driver › Add driver: the driver of a rented vehicle, saved for everyone. */
export async function createRentDriver(input: string): Promise<AddResult> {
  await getCurrentUser();
  const name = cleanName(input);
  if (!name) return { ok: false, problem: "Enter the driver's name (letters only)." };
  return { ok: true, ...(await addRentDriver(name)) };
}

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

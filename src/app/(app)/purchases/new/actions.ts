"use server";

import { addParty, getCurrentUser, getParties, getProducts } from "@/lib/data";
import { mobileOf } from "@/lib/mobile";

export type NewSupplierResult = { ok: true; supplier: { id: string; name: string; brands?: string[] } } | { ok: false; problem: string };

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

/** New purchase › Company › New supplier: a company we buy from, saved for everyone and picked straight away. */
export async function createSupplier(input: { name: string; brands: string[]; place: string; mobile: string }): Promise<NewSupplierResult> {
  const me = await getCurrentUser();
  if (!["owner", "office", "godown"].includes(me.role)) return { ok: false, problem: "You can't add suppliers." };
  const name = text(input?.name, 80);
  if (name.length < 2 || !/\p{L}/u.test(name)) return { ok: false, problem: "Enter the company's name." };
  const existing = (await getParties()).find((p) => p.kind === "company" && p.name.toLowerCase() === name.toLowerCase());
  if (existing) return { ok: true, supplier: { id: existing.id, name: existing.name, brands: existing.brands } };
  const known = new Set((await getProducts()).map((p) => p.brand));
  const brands = (Array.isArray(input.brands) ? input.brands : []).filter((b) => typeof b === "string" && known.has(b));
  const mobile = mobileOf(text(input.mobile, 20));
  if (mobile && mobile.length !== 10) return { ok: false, problem: "Enter a 10-digit mobile number, or leave it empty." };
  const party = await addParty({
    name,
    kind: "company",
    brands: brands.length ? brands : undefined,
    place: text(input.place, 60) || undefined,
    mobile: mobile || undefined,
    creditLimit: null,
    openingBalance: 0,
  });
  return { ok: true, supplier: { id: party.id, name: party.name, brands: party.brands } };
}

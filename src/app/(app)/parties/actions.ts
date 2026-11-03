"use server";

import { addParty, deleteParty, getCurrentUser, getParties, getProfiles } from "@/lib/data";
import type { Party } from "@/lib/data/types";

export type PartyInput = {
  kind: "customer" | "sub_dealer" | "company" | "lorry_owner";
  name: string;
  place: string;
  mobile: string;
  email: string;
  gstin: string;
  creditLimit: number | null;
  openingBalance: number;
  assignedTo: string;
};

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
// State code, PAN (5 letters, 4 digits, a letter), entity number, Z, check character: 37ABCDE1234F1Z5.
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Parties › New party: saves the party so it can be used straight away; field staff add customers and sub-dealers only. */
export async function createParty(input: PartyInput): Promise<{ ok: true; id: string } | { ok: false; problem: string }> {
  const user = await getCurrentUser();
  if (user.role !== "owner" && user.role !== "office" && user.role !== "field") return { ok: false, problem: "Only the owner, office and sales staff can add parties." };
  const kinds: PartyInput["kind"][] = user.role === "field" ? ["customer", "sub_dealer"] : ["customer", "sub_dealer", "company", "lorry_owner"];
  const kind = kinds.includes(input?.kind) ? input.kind : null;
  if (!kind) return { ok: false, problem: "Choose what kind of party this is." };
  const name = text(input.name, 80);
  if (name.length < 2) return { ok: false, problem: "Enter the party name." };
  const mobile = text(input.mobile, 20).replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  if (mobile && mobile.length !== 10) return { ok: false, problem: "Enter a 10-digit mobile number, or leave it empty." };
  const email = text(input.email, 80).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, problem: "That email doesn't look right." };
  const gstin = text(input.gstin, 15).toUpperCase();
  if (gstin && !GSTIN.test(gstin)) return { ok: false, problem: "That GSTIN doesn't look right." };
  const sellsToThem = kind === "customer" || kind === "sub_dealer";
  const creditLimit = sellsToThem ? Number(input.creditLimit) : null;
  if (sellsToThem && !(Number.isFinite(creditLimit) && (creditLimit ?? -1) >= 0)) return { ok: false, problem: "Set a credit limit (0 for cash only)." };
  const openingBalance = Number(input.openingBalance);
  if (!Number.isFinite(openingBalance) || Math.abs(openingBalance) > 100_000_000) return { ok: false, problem: "Enter the opening balance in rupees." };
  const staff = (await getProfiles()).find((p) => p.id === input.assignedTo && p.role === "field");

  const parties = await getParties();
  if (parties.some((p) => p.name.toLowerCase() === name.toLowerCase())) return { ok: false, problem: "There is already a party with that name." };
  if (mobile && parties.some((p) => p.mobile === mobile)) return { ok: false, problem: "Another party already has this mobile number." };

  const party: Omit<Party, "id" | "original"> = {
    name,
    kind,
    place: text(input.place, 60) || undefined,
    mobile: mobile || undefined,
    email: email || undefined,
    gstin: gstin || undefined,
    creditLimit: sellsToThem ? Math.round((creditLimit ?? 0) * 100) / 100 : null,
    openingBalance: Math.round(openingBalance * 100) / 100,
    assignedTo: sellsToThem ? staff?.id : undefined,
  };
  return { ok: true, id: (await addParty(party)).id };
}

/** Deletes a party you added (or a real supplier). Sample parties stay. */
export async function removeParty(id: string): Promise<{ ok: true } | { ok: false; problem: string }> {
  const user = await getCurrentUser();
  if (user.role !== "owner" && user.role !== "office") return { ok: false, problem: "Only the owner and the office can delete parties." };
  if (!(await deleteParty(String(id)))) return { ok: false, problem: "Only parties you added can be deleted." };
  return { ok: true };
}

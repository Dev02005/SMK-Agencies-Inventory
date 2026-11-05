"use server";

import { addPersonalBankAccount, getCurrentUser } from "@/lib/data";
import { isPersonalUnlocked } from "@/lib/personal-lock";

export type PersonalBankInput = { bank: string; name: string; accountNo: string; ifsc: string; branch: string; openingBalance: number };
export type PersonalBankResult = { ok: true; name: string } | { ok: false; problem: string };

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** Personal › Banks › Add bank: one of the owner's own accounts, saved in the records. Owner only, with Personal unlocked. */
export async function addPersonalBank(input: PersonalBankInput): Promise<PersonalBankResult> {
  if ((await getCurrentUser()).role !== "owner") return { ok: false, problem: "Only the owner has personal banks." };
  if (!(await isPersonalUnlocked())) return { ok: false, problem: "Personal is locked. Enter your PIN again." };
  const bank = text(input?.bank, 60);
  if (bank.length < 2) return { ok: false, problem: "Choose the bank." };
  const accountNo = text(input.accountNo, 30).replace(/\s/g, "");
  if (!/^\d{6,20}$/.test(accountNo)) return { ok: false, problem: "Enter the account number (6 to 20 digits)." };
  const ifsc = text(input.ifsc, 11).toUpperCase();
  if (ifsc && !IFSC.test(ifsc)) return { ok: false, problem: "The IFSC should look like SBIN0001234 (11 characters)." };
  const opening = Number(input.openingBalance);
  if (!Number.isFinite(opening) || Math.abs(opening) > 1_000_000_000) return { ok: false, problem: "Enter the opening balance as a number." };
  const name = text(input.name, 60) || `${bank.replace(/ (Bank|of India)$/i, "")} savings`;
  const saved = await addPersonalBankAccount({ bank, name, accountNo, ifsc: ifsc || undefined, branch: text(input.branch, 60) || undefined, openingBalance: Math.round(opening * 100) / 100 });
  return { ok: true, name: saved.name };
}

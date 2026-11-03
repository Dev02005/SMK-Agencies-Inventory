"use server";

import { updateTag } from "next/cache";
import { getCurrentUser } from "@/lib/data";
import { FIRMS_TAG, readFirmsFile, writeFirmsFile } from "@/lib/data/firms";

export type FirmInput = { id?: string; name: string; gstin: string; phone: string; address: string; primary: boolean };
export type SaveFirmResult = { ok: true } | { ok: false; problem: string };

// State code, PAN (5 letters, 4 digits, a letter), entity number, Z, check character: 37ABCDE1234F1Z5.
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/**
 * Saves a firm (a new one when there is no id). Ticking Primary makes it the firm sales are billed from and unticks
 * the others; the primary firm stays primary until another firm is ticked, so there is always exactly one.
 */
export async function saveFirm(input: FirmInput): Promise<SaveFirmResult> {
  const user = await getCurrentUser();
  if (user.role !== "owner" && user.role !== "office") return { ok: false, problem: "Only the owner and the office can change firm details." };

  const name = text(input?.name);
  const gstin = text(input?.gstin).toUpperCase();
  const phone = text(input?.phone).replace(/\D/g, "");
  const address = text(input?.address);
  if (!name) return { ok: false, problem: "Enter the firm name." };
  if (name.length > 120 || address.length > 300) return { ok: false, problem: "That is too long for a firm name or address." };
  if (gstin && !GSTIN.test(gstin)) return { ok: false, problem: "That GSTIN doesn't look right. It has 15 letters and numbers, like 37ABCDE1234F1Z5." };
  if (phone && phone.length !== 10) return { ok: false, problem: "Enter a 10-digit phone number." };

  const firms = readFirmsFile();
  const existing = input.id ? firms.find((f) => f.id === input.id) : undefined;
  if (input.id && !existing) return { ok: false, problem: "That firm is no longer there. Reload the page." };
  if (firms.some((f) => f.id !== existing?.id && f.name.toLowerCase() === name.toLowerCase())) return { ok: false, problem: "There is already a firm with that name." };

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "firm";
  let id = existing?.id ?? `firm-${slug}`;
  for (let n = 2; !existing && firms.some((f) => f.id === id); n++) id = `firm-${slug}-${n}`;

  const firm = { id, name, gstin, phone, address, primary: Boolean(input.primary) || Boolean(existing?.primary) };
  let next = existing ? firms.map((f) => (f.id === id ? firm : f)) : [...firms, firm];
  if (firm.primary) next = next.map((f) => ({ ...f, primary: f.id === id }));

  writeFirmsFile(next);
  updateTag(FIRMS_TAG);
  return { ok: true };
}

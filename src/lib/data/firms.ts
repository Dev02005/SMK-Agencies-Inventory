import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { readLocal, writeLocal } from "./local-data";
import type { Firm } from "./types";

/**
 * The owner's firms, from local-data/firms.json (saved from Settings › Firm details). Exactly one is the primary
 * firm: sales are billed only from it, while purchases can be in any firm. Without the file the app shows a blank
 * firm to fill in. With Supabase this becomes the firms table.
 */
const FILE = "firms.json";
export const FIRMS_TAG = "firms";

const blankFirm: Firm = { id: "firm-1", name: "Your firm", gstin: "", address: "", phone: "", primary: true };

function isFirm(f: unknown): f is Firm {
  const x = f as Partial<Firm> | null;
  return Boolean(x && typeof x.id === "string" && x.id && typeof x.name === "string" && x.name.trim());
}

/** The firms as saved, with exactly one primary (the first one marked, else the first firm). */
export function readFirmsFile(): Firm[] {
  const data = readLocal(FILE) as { firms?: unknown[] } | undefined;
  const firms = (Array.isArray(data?.firms) ? data.firms.filter(isFirm) : []).map((f) => ({
    id: f.id,
    name: f.name.trim(),
    gstin: f.gstin?.trim() ?? "",
    address: f.address?.trim() ?? "",
    phone: f.phone?.trim() ?? "",
    primary: Boolean(f.primary),
  }));
  if (firms.length === 0) return [blankFirm];
  const primary = firms.find((f) => f.primary) ?? firms[0];
  return firms.map((f) => ({ ...f, primary: f.id === primary.id }));
}

export function writeFirmsFile(firms: Firm[]) {
  writeLocal(FILE, {
    about: "The owner's firms, saved from Settings > Firm details. Only the primary firm makes sales; purchases can be in any firm.",
    firms,
  });
}

/** Cached until a firm is saved (the save calls updateTag(FIRMS_TAG)). */
export async function loadFirms(): Promise<Firm[]> {
  "use cache";
  cacheLife("max");
  cacheTag(FIRMS_TAG);
  return readFirmsFile();
}

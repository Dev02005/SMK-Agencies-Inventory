import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { readRecord, syncRecords, writeRecord } from "./store";
import type { Firm } from "./types";

/**
 * The owner's firms, from the firms.json record (saved from Settings › Firm details). Exactly one is the primary
 * firm: sales are billed only from it, while purchases can be in any firm. Without it the app shows a blank firm
 * to fill in.
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
  const data = readRecord(FILE) as { firms?: unknown[] } | undefined;
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

/** Call it only inside saving() (store.ts). */
export function writeFirmsFile(firms: Firm[]) {
  writeRecord(FILE, {
    about: "The owner's firms, saved from Settings > Firm details. Only the primary firm makes sales; purchases can be in any firm.",
    firms,
  });
}

/**
 * Cached, because the sign-in page, the app icon and the share image are built ahead with the firm's name. A save
 * refreshes it at once (updateTag(FIRMS_TAG)); online, the other servers pick the change up within the hour.
 */
export async function loadFirms(): Promise<Firm[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(FIRMS_TAG);
  await syncRecords();
  return readFirmsFile();
}

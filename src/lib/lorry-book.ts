"use client";

import { useSyncExternalStore } from "react";

/**
 * Lorries noted on this device (Sales › Lorry sales › Lorry arrived) while the app runs on sample data, so a new lorry
 * shows under Lorry sales and in New sale's "Load from". With Supabase these become rows (a purchase sold from the
 * lorry) and this store goes away.
 */
export type LocalLorry = {
  id: string;
  companyId: string;
  companyName: string;
  lorryNo: string;
  driverName: string;
  invoiceNo?: string;
  invoicePaperKept: boolean;
  unloadingCharges: boolean;
  /** Expected to sell out in about this many days. */
  sellOutDays?: number;
  /** YYYY-MM-DD. */
  arrivedOn: string;
  /** What came on the lorry (bags of cement, kg of steel). Lorries saved before this was asked have none. */
  lines?: { productId: string; qty: number }[];
  /** Once sold out: the value of the lorry's material, given by whoever closes it, then confirmed by the owner. */
  closed?: { value: number; on: string; confirmed?: boolean };
};

const KEY = "ska-lorry-book";
const empty: LocalLorry[] = [];
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cached: LocalLorry[] = empty;

function read(): LocalLorry[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return empty;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const value = JSON.parse(raw ?? "null");
      cached = Array.isArray(value) ? value : empty;
    } catch {
      cached = empty;
    }
  }
  return cached;
}

function write(next: LocalLorry[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    throw new Error("This device could not save it (storage is full or blocked).");
  }
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

export function useLorryBook(): LocalLorry[] {
  return useSyncExternalStore(subscribe, read, () => empty);
}

export function addLorry(lorry: Omit<LocalLorry, "id">) {
  const saved = { ...lorry, id: `local-${Date.now().toString(36)}` };
  write([saved, ...read()]);
  return saved;
}

export function closeLorry(id: string, value: number, on: string) {
  write(read().map((l) => (l.id === id ? { ...l, closed: { value, on } } : l)));
}

export function confirmLorry(id: string) {
  write(read().map((l) => (l.id === id && l.closed ? { ...l, closed: { ...l.closed, confirmed: true } } : l)));
}

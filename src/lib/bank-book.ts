"use client";

import { useSyncExternalStore } from "react";

/**
 * Banks added and entries saved on this device while the app runs on sample data, so adding a bank, adding an
 * entry and importing a statement can be tried for real. With Supabase these become rows in bank_accounts and
 * bank_entries (statement rows keep their reference and printed balance) and this store goes away.
 */
export type LocalBankAccount = {
  id: string;
  bank: string;
  name: string;
  accountNo: string;
  ifsc?: string;
  branch?: string;
  holder?: string;
  type: "current" | "savings" | "od";
  openingBalance: number;
  openingDate: string;
};

export type LocalBankEntry = {
  id: string;
  accountId: string;
  date: string;
  /** Positive = money in, negative = money out. */
  amount: number;
  description: string;
  ref?: string;
  source: "manual" | "statement";
  /** The balance printed on the statement for this row. */
  statementBalance?: number;
};

type Book = { accounts: LocalBankAccount[]; entries: LocalBankEntry[] };

const KEY = "ska-bank-book";
const empty: Book = { accounts: [], entries: [] };
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cached: Book = empty;

function read(): Book {
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
      cached = value && Array.isArray(value.accounts) && Array.isArray(value.entries) ? value : empty;
    } catch {
      cached = empty;
    }
  }
  return cached;
}

function write(next: Book) {
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

export function useBankBook(): Book {
  return useSyncExternalStore(subscribe, read, () => empty);
}

export function addBankAccount(account: Omit<LocalBankAccount, "id">): LocalBankAccount {
  const saved = { ...account, id: `local-${Date.now().toString(36)}` };
  const book = read();
  write({ ...book, accounts: [...book.accounts, saved] });
  return saved;
}

export function addBankEntries(entries: Omit<LocalBankEntry, "id">[]) {
  const book = read();
  const stamp = Date.now().toString(36);
  write({ ...book, entries: [...book.entries, ...entries.map((e, i) => ({ ...e, id: `le-${stamp}-${i}` }))] });
}

/** "00001234567890" → "•••• 7890"; already-masked numbers pass through. */
export function maskAccountNo(accountNo: string) {
  const digits = accountNo.replace(/\D/g, "");
  return digits.length >= 4 && !accountNo.includes("•") ? `•••• ${digits.slice(-4)}` : accountNo;
}

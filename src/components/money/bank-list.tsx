"use client";

import { maskAccountNo, useBankBook } from "@/lib/bank-book";
import type { BankAccount } from "@/lib/data/types";
import { formatINR } from "@/lib/format";
import { BankCards } from "./bank-views";

/** Business banks: the saved accounts plus any added on this device, with entries saved here counted in each balance. */
export function BankList({ accounts, firmNames }: { accounts: (BankAccount & { balance: number })[]; firmNames: Record<string, string> }) {
  const book = useBankBook();
  const saved = (id: string) => book.entries.filter((e) => e.accountId === id).reduce((s, e) => s + e.amount, 0);
  const all = [
    ...accounts.map((a) => ({ ...a, balance: a.balance + saved(a.id) })),
    ...book.accounts.map((a) => ({
      id: a.id,
      bank: a.bank,
      name: a.name,
      accountNo: maskAccountNo(a.accountNo),
      scope: "business" as const,
      openingBalance: a.openingBalance,
      balance: a.openingBalance + saved(a.id),
    })),
  ];
  return (
    <div className="space-y-3">
      <BankCards accounts={all} hrefBase="/money/banks" firmNames={firmNames} />
      <p className="px-1 text-[13px] text-ink-secondary">
        Total in business banks: <span className="font-medium text-ink">{formatINR(all.reduce((s, a) => s + a.balance, 0))}</span>. Open a bank to add an
        entry or import its statement PDF.
      </p>
    </div>
  );
}

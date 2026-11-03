"use client";

import { FileUp, Plus } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { ButtonLink, IconButton } from "@/components/ui/button";
import { DataTools } from "@/components/ui/data-tools";
import { useDateFilter } from "@/components/ui/date-filter";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { maskAccountNo, useBankBook } from "@/lib/bank-book";
import type { BankAccount, BankEntry } from "@/lib/data/types";
import { inDateFilter } from "@/lib/date-filter";
import { formatINR } from "@/lib/format";
import { BankEntryForm } from "./bank-entry-form";
import { BankEntriesTable } from "./bank-views";
import { StatementImport } from "./statement-import";

const noop = () => () => {};

/**
 * One bank account: its transactions with a running balance, plus Add entry and Import statement. Entries saved
 * on this device (by hand or from a statement) are merged in by date; banks added on this device work the same way.
 */
export function BankAccountView({ accountId, account: saved, entries: savedEntries }: { accountId: string; account?: BankAccount; entries: BankEntry[] }) {
  const book = useBankBook();
  const ready = useSyncExternalStore(noop, () => true, () => false);
  const [panel, setPanel] = useState<"entry" | "import" | null>(null);
  const dates = useDateFilter();

  const local = book.accounts.find((a) => a.id === accountId);
  const account: BankAccount | undefined =
    saved ?? (local && { id: local.id, bank: local.bank, name: local.name, accountNo: local.accountNo, scope: "business", openingBalance: local.openingBalance });

  if (!account) {
    if (!ready) return <ListSkeleton rows={6} />;
    return (
      <EmptyState icon={FileUp} title="This bank isn't on this device" action={<ButtonLink href="/money/banks/add">Add bank</ButtonLink>}>
        Banks added before the database is connected are kept on the device they were added on.
      </EmptyState>
    );
  }

  const deviceEntries: BankEntry[] = book.entries
    .filter((e) => e.accountId === accountId)
    .map((e) => ({ id: e.id, accountId, date: e.date, amount: e.amount, description: e.description, ref: e.ref, source: e.source }));
  // Oldest first for the running balance (saved entries before device entries on the same day), shown newest first.
  const ordered = [...savedEntries, ...deviceEntries]
    .map((e, order) => ({ e, order }))
    .sort((a, b) => a.e.date.localeCompare(b.e.date) || a.order - b.order)
    .map(({ e }) => e);
  const rows = ordered
    .reduce<(BankEntry & { balance: number })[]>((out, e) => [...out, { ...e, balance: (out.at(-1)?.balance ?? account.openingBalance) + e.amount }], [])
    .reverse();
  const balance = rows[0]?.balance ?? account.openingBalance;

  return (
    <>
      <PageHeader
        title={account.name}
        subtitle={[
          account.bank,
          account.ifsc ? account.accountNo : maskAccountNo(account.accountNo),
          account.ifsc && `IFSC ${account.ifsc}`,
          account.branch && `${account.branch} branch`,
          `balance ${formatINR(balance)}`,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <SampleChip />
            <IconButton label="Import statement" onClick={() => setPanel(panel === "import" ? null : "import")} aria-expanded={panel === "import"}>
              <FileUp size={19} strokeWidth={1.9} aria-hidden />
            </IconButton>
            <IconButton label="Add entry" variant="primary" onClick={() => setPanel(panel === "entry" ? null : "entry")} aria-expanded={panel === "entry"}>
              <Plus size={20} strokeWidth={2} aria-hidden />
            </IconButton>
          </>
        }
      />

      {panel === "entry" && (
        <section aria-label="Add entry" className="surface mb-5 p-5 md:p-6">
          <h2 className="mb-4 text-[17px] font-semibold tracking-[-0.3px] text-ink">Add entry to {account.name}</h2>
          <BankEntryForm accounts={[{ id: account.id, name: account.name }]} accountId={account.id} onDone={() => setPanel(null)} />
        </section>
      )}
      {panel === "import" && (
        <StatementImport account={account} existing={rows.map((r) => ({ date: r.date, amount: r.amount }))} onClose={() => setPanel(null)} />
      )}

      <DataTools title={account.name} className="mb-4" />
      <BankEntriesTable entries={rows.filter((r) => inDateFilter(r.date, dates))} />
      {deviceEntries.length > 0 && (
        <p className="mt-3 px-1 text-[13px] text-ink-secondary">
          {deviceEntries.length} {deviceEntries.length === 1 ? "entry is" : "entries are"} saved on this device and move to the database once it is connected.
        </p>
      )}
    </>
  );
}

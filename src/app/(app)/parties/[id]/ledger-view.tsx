"use client";

import Link from "next/link";
import { useState } from "react";
import { SectionCard } from "@/components/ui/blocks";
import { DataTable } from "@/components/ui/data-table";
import { DataTools } from "@/components/ui/data-tools";
import { useDateFilter } from "@/components/ui/date-filter";
import { Segmented } from "@/components/ui/segmented";
import type { LedgerEntry } from "@/lib/data/types";
import { inDateFilter } from "@/lib/date-filter";
import { formatBalance, formatDate, formatINR, formatMonth, formatShortDate } from "@/lib/format";

type MonthRow = { month: string; debit: number; credit: number; closing: number };

function byMonth(entries: LedgerEntry[]): MonthRow[] {
  const months = new Map<string, MonthRow>();
  for (const e of entries) {
    const key = e.date.slice(0, 7);
    const row = months.get(key) ?? { month: key, debit: 0, credit: 0, closing: 0 };
    row.debit += e.debit;
    row.credit += e.credit;
    row.closing = e.balance;
    months.set(key, row);
  }
  return [...months.values()].reverse();
}

/** Party ledger in two views: every entry (detailed) or month totals (summary). Newest first. */
export function LedgerView({ entries, partyName }: { entries: LedgerEntry[]; partyName: string }) {
  const [view, setView] = useState<"detailed" | "summary">("detailed");
  const dates = useDateFilter();
  // Balances stay as worked out over the whole ledger; the filter only picks which lines show.
  const shown = entries.filter((e) => inDateFilter(e.date, dates));
  const newestFirst = [...shown].reverse();

  return (
    <SectionCard
      title="Ledger"
      action={
        <Segmented
          label="Ledger view"
          className="w-56"
          value={view}
          onChange={setView}
          options={[
            { value: "detailed", label: "Detailed" },
            { value: "summary", label: "Summary" },
          ]}
        />
      }
    >
      <DataTools title={`Ledger ${partyName}`} className="mb-4" />
      <div className="-mx-5 -mb-5 md:-mx-6 md:-mb-6 [&_.surface]:rounded-none [&_.surface]:border-0 [&_.surface]:shadow-none">
        {view === "detailed" ? (
          <DataTable
            rows={newestFirst}
            rowKey={(e) => `${e.date}-${e.ref}`}
            empty="No entries in these dates."
            mobile={(e) => ({
              title: e.href ? <Link href={e.href} className="text-link">{e.ref}</Link> : e.ref,
              subtitle: `${formatShortDate(e.date)} · ${e.narration}`,
              value: e.debit ? `+ ${formatINR(e.debit)}` : `− ${formatINR(e.credit)}`,
              meta: <span className="text-[12px] text-ink-secondary">{formatBalance(e.balance)}</span>,
            })}
            columns={[
              { key: "date", header: "Date", cell: (e) => formatDate(e.date), className: "whitespace-nowrap" },
              {
                key: "ref",
                header: "Entry",
                cell: (e) => (e.href ? <Link href={e.href} className="text-link hover:underline">{e.ref}</Link> : e.ref),
                className: "whitespace-nowrap",
              },
              { key: "narration", header: "Details", cell: (e) => e.narration, className: "text-ink-secondary" },
              { key: "debit", header: "Debit", align: "right", cell: (e) => (e.debit ? formatINR(e.debit) : "") },
              { key: "credit", header: "Credit", align: "right", cell: (e) => (e.credit ? formatINR(e.credit) : "") },
              { key: "balance", header: "Balance", align: "right", cell: (e) => formatBalance(e.balance), className: "whitespace-nowrap" },
            ]}
          />
        ) : (
          <DataTable
            rows={byMonth(shown)}
            rowKey={(m) => m.month}
            mobile={(m) => ({
              title: formatMonth(m.month),
              subtitle: `Debit ${formatINR(m.debit)} · Credit ${formatINR(m.credit)}`,
              value: formatBalance(m.closing),
            })}
            columns={[
              { key: "month", header: "Month", cell: (m) => formatMonth(m.month) },
              { key: "debit", header: "Debit", align: "right", cell: (m) => formatINR(m.debit) },
              { key: "credit", header: "Credit", align: "right", cell: (m) => formatINR(m.credit) },
              { key: "closing", header: "Closing balance", align: "right", cell: (m) => formatBalance(m.closing) },
            ]}
          />
        )}
      </div>
    </SectionCard>
  );
}

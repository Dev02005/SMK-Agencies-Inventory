"use client";

import { Camera } from "lucide-react";
import { useState } from "react";
import { StatCard, StatRow } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/ui/data-table";
import { FilterChips, SearchInput } from "@/components/ui/filters";
import type { Expense, ExpenseHead } from "@/lib/data/types";
import { formatDate, formatINR, formatShortDate } from "@/lib/format";
import { expenseHeadLabels } from "@/lib/labels";

type Row = Expense & { paidFromLabel: string };

export function ExpensesList({ expenses, month }: { expenses: Row[]; month: string }) {
  const [head, setHead] = useState<ExpenseHead | "all">("all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const rows = expenses.filter(
    (e) => (head === "all" || e.head === head) && (!q || `${e.description} ${e.tag?.label ?? ""} ${e.paidFromLabel}`.toLowerCase().includes(q)),
  );
  const thisMonth = expenses.filter((e) => e.date.startsWith(month));
  const byHead = (Object.keys(expenseHeadLabels) as ExpenseHead[])
    .map((h) => ({ head: h, total: thisMonth.filter((e) => e.head === h).reduce((s, e) => s + e.amount, 0) }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total);
  const cash = thisMonth.filter((e) => e.paidFrom === "cash").reduce((s, e) => s + e.amount, 0);
  const total = thisMonth.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      <StatRow>
        <StatCard label="This month" value={formatINR(total)} hint={`${thisMonth.length} entries`} />
        <StatCard label="Biggest head" value={byHead[0] ? expenseHeadLabels[byHead[0].head] : "–"} hint={byHead[0] && formatINR(byHead[0].total)} />
        <StatCard label="Paid in cash" value={formatINR(cash)} hint={`${formatINR(total - cash)} from bank`} />
      </StatRow>

      <div className="surface p-5 md:p-6">
        <h2 className="mb-3 text-[17px] font-semibold tracking-[-0.3px] text-ink">This month by head</h2>
        <ul className="space-y-2.5">
          {byHead.map((x) => (
            <li key={x.head} className="grid grid-cols-[130px_1fr_auto] items-center gap-3 text-[13px] md:grid-cols-[160px_1fr_auto]">
              <span className="truncate text-ink-secondary">{expenseHeadLabels[x.head]}</span>
              <span className="h-2 overflow-hidden rounded-full bg-hairline">
                <span className="block h-full bg-good" style={{ width: `${(x.total / byHead[0].total) * 100}%` }} />
              </span>
              <span className="text-right tabular-nums text-ink">{formatINR(x.total)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          label="Expense head"
          value={head}
          onChange={setHead}
          options={[{ value: "all" as const, label: "All" }, ...byHead.map((x) => ({ value: x.head, label: expenseHeadLabels[x.head] }))]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search description, vehicle or person" className="lg:w-80" />
      </div>

      <DataTable
        rows={rows}
        rowKey={(e) => e.id}
        empty="No expenses match."
        mobile={(e) => ({
          title: e.description,
          subtitle: `${formatShortDate(e.date)} · ${expenseHeadLabels[e.head]}${e.tag ? ` · ${e.tag.label}` : ""}`,
          value: formatINR(e.amount),
          meta: <span className="text-[12px] text-ink-secondary">{e.paidFromLabel}</span>,
        })}
        columns={[
          { key: "date", header: "Date", cell: (e) => formatDate(e.date), className: "whitespace-nowrap text-ink-secondary" },
          { key: "head", header: "Head", cell: (e) => <Chip>{expenseHeadLabels[e.head]}</Chip> },
          { key: "what", header: "Description", cell: (e) => e.description },
          { key: "tag", header: "For", cell: (e) => e.tag?.label ?? "–", className: "hidden text-ink-secondary lg:table-cell" },
          { key: "from", header: "Paid from", cell: (e) => e.paidFromLabel, className: "hidden text-ink-secondary xl:table-cell" },
          {
            key: "photo",
            header: "",
            srHeader: "Bill photo",
            cell: (e) => e.hasPhoto && <Camera size={16} strokeWidth={1.75} className="text-ink-tertiary" aria-label="Bill photo attached" />,
          },
          { key: "amount", header: "Amount", align: "right", cell: (e) => formatINR(e.amount) },
        ]}
      />
    </div>
  );
}

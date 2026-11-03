import { ChevronRight, Landmark } from "lucide-react";
import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/ui/data-table";
import { maskAccountNo } from "@/lib/bank-book";
import type { BankAccount, BankEntry } from "@/lib/data/types";
import { formatDate, formatINR, formatShortDate } from "@/lib/format";

const signed = (n: number) => (n >= 0 ? `+ ${formatINR(n)}` : `− ${formatINR(-n)}`);

/** One card per bank account; used for business banks and the owner's personal accounts. */
export function BankCards({ accounts, hrefBase, firmNames = {} }: { accounts: (BankAccount & { balance: number })[]; hrefBase: string; firmNames?: Record<string, string> }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {accounts.map((a) => (
        <li key={a.id}>
          <Link href={`${hrefBase}/${a.id}`} className="surface flex items-center gap-4 p-5 transition hover:shadow-raised md:p-6">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-good-soft text-good">
              <Landmark size={21} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[17px] font-semibold tracking-[-0.3px] text-ink">{a.name}</span>
              <span className="block text-[13px] text-ink-secondary">
                {a.bank} · {maskAccountNo(a.accountNo)}
              </span>
              {(a.ifsc || a.branch) && (
                <span className="block text-[12px] text-ink-secondary">{[a.ifsc && `IFSC ${a.ifsc}`, a.branch && `${a.branch} branch`].filter(Boolean).join(" · ")}</span>
              )}
              {a.firmId && firmNames[a.firmId] && <span className="mt-1 block truncate text-[12px] font-medium text-accent">{firmNames[a.firmId]}</span>}
            </span>
            <span className="text-right">
              <span className="block text-[12px] text-ink-secondary">Balance</span>
              <span className="block text-[22px] font-semibold tabular-nums tracking-[-0.3px] text-ink">{formatINR(a.balance)}</span>
            </span>
            <ChevronRight size={18} strokeWidth={1.75} className="text-ink-tertiary" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function BankEntriesTable({ entries }: { entries: (BankEntry & { balance: number })[] }) {
  return (
    <DataTable
      rows={entries}
      rowKey={(e) => e.id}
      rowHref={(e) => e.href}
      empty="No entries yet."
      mobile={(e) => ({
        title: e.description,
        subtitle: [formatShortDate(e.date), e.ref, e.source === "statement" ? "from statement" : e.source === "manual" ? "added here" : undefined].filter(Boolean).join(" · "),
        value: <span className={e.amount > 0 ? "text-good" : undefined}>{signed(e.amount)}</span>,
        meta: <span className="text-[12px] text-ink-secondary">{formatINR(e.balance)}</span>,
      })}
      columns={[
        { key: "date", header: "Date", cell: (e) => formatDate(e.date), className: "whitespace-nowrap text-ink-secondary" },
        {
          key: "what",
          header: "Entry",
          cell: (e) => (
            <span className="block max-w-[520px]">
              <span className="block">{e.description}</span>
              {(e.ref || e.source) && (
                <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-ink-secondary">
                  {e.ref && <span>Ref {e.ref}</span>}
                  {e.source === "statement" && <Chip tone="accent">From statement</Chip>}
                  {e.source === "manual" && <Chip>Added here</Chip>}
                </span>
              )}
            </span>
          ),
        },
        { key: "in", header: "In", align: "right", cell: (e) => (e.amount > 0 ? <span className="text-good">{formatINR(e.amount)}</span> : "") },
        { key: "out", header: "Out", align: "right", cell: (e) => (e.amount < 0 ? formatINR(-e.amount) : "") },
        { key: "balance", header: "Balance", align: "right", cell: (e) => formatINR(e.balance) },
      ]}
    />
  );
}

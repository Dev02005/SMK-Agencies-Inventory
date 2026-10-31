"use client";

import { useState } from "react";
import { StatCard, StatRow } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/ui/data-table";
import { FilterChips, SearchInput } from "@/components/ui/filters";
import { Segmented } from "@/components/ui/segmented";
import type { Payment, PaymentMode, Receipt } from "@/lib/data/types";
import { formatDate, formatINR, formatShortDate } from "@/lib/format";
import { paymentModeLabels } from "@/lib/labels";

type Named<T> = T & { partyName: string };

export function MoneyLists({
  receipts,
  payments,
  staff,
  fieldStaff,
  month,
}: {
  receipts: Named<Receipt>[];
  payments: Named<Payment>[];
  staff: Record<string, string>;
  /** Ids of sales & collection staff, whose cash collections are tracked separately. */
  fieldStaff: string[];
  month: string;
}) {
  const [tab, setTab] = useState<"receipts" | "payments">("receipts");
  const [mode, setMode] = useState<PaymentMode | "all">("all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filter = <T extends { mode: PaymentMode; partyName: string; reference?: string }>(rows: T[]) =>
    rows.filter((r) => (mode === "all" || r.mode === mode) && (!q || `${r.partyName} ${r.reference ?? ""}`.toLowerCase().includes(q)));

  const monthTotal = (rows: { date: string; amount: number }[]) => rows.filter((r) => r.date.startsWith(month)).reduce((s, r) => s + r.amount, 0);
  const cashWithStaff = receipts.filter((r) => r.mode === "cash" && r.collectedBy && fieldStaff.includes(r.collectedBy));

  return (
    <div className="space-y-4">
      <StatRow>
        <StatCard label="Received this month" value={formatINR(monthTotal(receipts))} tone="good" />
        <StatCard label="Paid this month" value={formatINR(monthTotal(payments))} />
        <StatCard label="Collected by staff" value={formatINR(cashWithStaff.filter((r) => r.date.startsWith(month)).reduce((s, r) => s + r.amount, 0))} hint="cash, this month" />
      </StatRow>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          <Segmented
            label="Show"
            className="md:w-64"
            value={tab}
            onChange={setTab}
            options={[
              { value: "receipts", label: "Receipts" },
              { value: "payments", label: "Payments" },
            ]}
          />
          <FilterChips
            label="Payment mode"
            value={mode}
            onChange={setMode}
            options={[{ value: "all" as const, label: "All modes" }, ...(Object.keys(paymentModeLabels) as PaymentMode[]).map((m) => ({ value: m, label: paymentModeLabels[m] }))]}
          />
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search party or reference" className="lg:w-72" />
      </div>

      {tab === "receipts" ? (
        <DataTable
          rows={filter(receipts)}
          rowKey={(r) => r.id}
          rowHref={(r) => `/parties/${r.partyId}`}
          empty="No receipts match."
          mobile={(r) => ({
            title: r.partyName,
            subtitle: `Receipt ${r.receiptNo} · ${formatShortDate(r.date)}${r.collectedBy ? ` · ${staff[r.collectedBy]}` : ""}`,
            value: formatINR(r.amount),
            meta: <Chip>{paymentModeLabels[r.mode]}</Chip>,
          })}
          columns={[
            { key: "party", header: "Party", cell: (r) => r.partyName },
            { key: "no", header: "Receipt", cell: (r) => `#${r.receiptNo}`, className: "text-ink-secondary" },
            { key: "date", header: "Date", cell: (r) => formatDate(r.date), className: "whitespace-nowrap text-ink-secondary" },
            { key: "mode", header: "Mode", cell: (r) => <Chip>{paymentModeLabels[r.mode]}</Chip> },
            { key: "ref", header: "Reference", cell: (r) => r.reference ?? "–", className: "hidden text-ink-secondary lg:table-cell" },
            { key: "by", header: "Collected by", cell: (r) => (r.collectedBy ? staff[r.collectedBy] : "–"), className: "hidden text-ink-secondary lg:table-cell" },
            { key: "amount", header: "Amount", align: "right", cell: (r) => formatINR(r.amount) },
          ]}
        />
      ) : (
        <DataTable
          rows={filter(payments)}
          rowKey={(p) => p.id}
          rowHref={(p) => `/parties/${p.partyId}`}
          empty="No payments match."
          mobile={(p) => ({
            title: p.partyName,
            subtitle: `Payment ${p.paymentNo} · ${formatShortDate(p.date)}`,
            value: formatINR(p.amount),
            meta: <Chip>{paymentModeLabels[p.mode]}</Chip>,
          })}
          columns={[
            { key: "party", header: "Paid to", cell: (p) => p.partyName },
            { key: "no", header: "Payment", cell: (p) => `#${p.paymentNo}`, className: "text-ink-secondary" },
            { key: "date", header: "Date", cell: (p) => formatDate(p.date), className: "whitespace-nowrap text-ink-secondary" },
            { key: "mode", header: "Mode", cell: (p) => <Chip>{paymentModeLabels[p.mode]}</Chip> },
            { key: "ref", header: "Reference", cell: (p) => p.reference ?? p.remarks ?? "–", className: "hidden text-ink-secondary lg:table-cell" },
            { key: "amount", header: "Amount", align: "right", cell: (p) => formatINR(p.amount) },
          ]}
        />
      )}
    </div>
  );
}

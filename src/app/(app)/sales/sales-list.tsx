"use client";

import { useState } from "react";
import { StatCard } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/ui/data-table";
import { DataTools } from "@/components/ui/data-tools";
import { useDateFilter } from "@/components/ui/date-filter";
import { FilterChips, SearchInput } from "@/components/ui/filters";
import type { SaleWithParty } from "@/lib/data";
import type { Product, SaleStatus } from "@/lib/data/types";
import { inDateFilter } from "@/lib/date-filter";
import { formatDate, formatINR, formatNumber, formatShortDate } from "@/lib/format";
import { saleStatus } from "@/lib/labels";
import { describeQuantities, sumQuantities } from "@/lib/quantities";

export function SalesList({ sales, products }: { sales: SaleWithParty[]; products: Product[] }) {
  const dates = useDateFilter();
  const [status, setStatus] = useState<SaleStatus | "all">("all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const inPeriod = sales.filter((s) => inDateFilter(s.billDate, dates));
  const rows = inPeriod.filter(
    (s) =>
      (status === "all" || s.status === status) &&
      (!q || `${s.partyName} ${s.billNo} ${s.destination ?? ""} ${s.paperMemo ?? ""}`.toLowerCase().includes(q)),
  );

  const saved = rows.filter((s) => s.status === "saved");
  const qty = sumQuantities(saved.flatMap((s) => s.lines), products);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard label="Sales" value={formatINR(saved.reduce((s, x) => s + x.total, 0))} hint={`${saved.length} bills`} />
        <StatCard label="Cement" value={`${formatNumber(qty.bags)} bags`} hint={`${formatNumber(qty.cementMT)} MT`} />
        <StatCard label="Steel" value={`${formatNumber(qty.steelMT)} MT`} hint={`${formatNumber(qty.kg)} kg`} />
        <StatCard
          label="Waiting approval"
          value={inPeriod.filter((s) => s.status === "pending_approval").length}
          tone="warning"
          hint="bills"
        />
      </div>

      <DataTools title="Godown sales" />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:gap-4">
          <FilterChips
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "Any status" },
              { value: "pending_approval", label: "Waiting" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search party, bill or memo no." className="lg:w-80" />
      </div>

      <DataTable
        rows={rows}
        rowKey={(s) => s.id}
        rowHref={(s) => `/sales/${s.id}`}
        empty="No bills for these dates."
        mobile={(s) => ({
          title: s.partyName,
          subtitle: `Bill ${s.billNo} · ${formatShortDate(s.billDate)} · ${describeQuantities(s.lines, products)}`,
          value: <span className={s.status === "cancelled" ? "text-ink-tertiary line-through" : undefined}>{formatINR(s.total)}</span>,
          meta: s.status !== "saved" && <Chip tone={saleStatus[s.status].tone}>{saleStatus[s.status].label}</Chip>,
        })}
        columns={[
          { key: "bill", header: "Bill", cell: (s) => `#${s.billNo}`, className: "whitespace-nowrap" },
          { key: "date", header: "Date", cell: (s) => formatDate(s.billDate), className: "whitespace-nowrap text-ink-secondary" },
          { key: "party", header: "Party", cell: (s) => s.partyName },
          {
            key: "items",
            header: "Quantity",
            cell: (s) => describeQuantities(s.lines, products),
            className: "hidden whitespace-nowrap text-ink-secondary lg:table-cell",
          },
          { key: "transport", header: "Transport", cell: (s) => s.transportMode, className: "hidden text-ink-secondary lg:table-cell" },
          {
            key: "total",
            header: "Total",
            align: "right",
            cell: (s) => <span className={s.status === "cancelled" ? "text-ink-tertiary line-through" : undefined}>{formatINR(s.total)}</span>,
          },
          {
            key: "status",
            header: "",
            cell: (s) => s.status !== "saved" && <Chip tone={saleStatus[s.status].tone}>{saleStatus[s.status].label}</Chip>,
          },
        ]}
      />
    </div>
  );
}

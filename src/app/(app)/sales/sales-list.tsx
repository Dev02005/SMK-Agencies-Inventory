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
import { inDateFilter, salesPresets } from "@/lib/date-filter";
import { formatDate, formatINR, formatNumber, formatShortDate } from "@/lib/format";
import { billName, saleStatus } from "@/lib/labels";
import { describeQuantities, sumQuantities } from "@/lib/quantities";

export function SalesList({ sales, products }: { sales: SaleWithParty[]; products: Product[] }) {
  const dates = useDateFilter(salesPresets);
  const [status, setStatus] = useState<SaleStatus | "all">("all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const inPeriod = sales.filter((s) => inDateFilter(s.billDate, dates));
  const rows = inPeriod.filter(
    (s) =>
      (status === "all" || s.status === status) &&
      (!q || `${s.partyName} ${s.billNo ?? ""} ${s.destination ?? ""} ${s.paperMemo ?? ""}`.toLowerCase().includes(q)),
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

      <DataTools title="Godown sales" presets={salesPresets} />
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
          title: (
            <>
              {s.partyName}
              {s.demo && <Chip tone="warning" className="ml-2 h-5 px-2 align-middle text-[11px]">Sample</Chip>}
            </>
          ),
          subtitle: `${billName(s)} · ${formatShortDate(s.billDate)} · ${describeQuantities(s.lines, products)}`,
          value: <SaleTotal sale={s} />,
          meta: s.status !== "saved" && <Chip tone={saleStatus[s.status].tone}>{saleStatus[s.status].label}</Chip>,
        })}
        columns={[
          { key: "bill", header: "Bill no.", cell: (s) => (s.billNo ? `#${s.billNo}` : "No bill no. yet"), className: "whitespace-nowrap font-medium text-ink" },
          { key: "date", header: "Date", cell: (s) => formatDate(s.billDate), className: "whitespace-nowrap text-ink-secondary" },
          { key: "party", header: "Party", cell: (s) => (s.demo ? <>{s.partyName}<Chip tone="warning" className="ml-2 h-5 px-2 align-middle text-[11px]">Sample</Chip></> : s.partyName) },
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
            cell: (s) => <SaleTotal sale={s} />,
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

/** The bill's total; a sale waiting for approval has no price until the owner adds it. */
function SaleTotal({ sale }: { sale: SaleWithParty }) {
  if (sale.status === "pending_approval") return <span className="text-[13px] text-ink-secondary">Price by owner</span>;
  return <span className={sale.status === "cancelled" ? "text-ink-tertiary line-through" : undefined}>{formatINR(sale.total)}</span>;
}

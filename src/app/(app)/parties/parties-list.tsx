"use client";

import { useState } from "react";
import { SampleTag, StatCard, StatRow } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/ui/data-table";
import { DataTools } from "@/components/ui/data-tools";
import { FilterChips, SearchInput } from "@/components/ui/filters";
import type { PartyWithBalance } from "@/lib/data";
import { formatBalance, formatINR } from "@/lib/format";
import { partyKindLabels } from "@/lib/labels";

type KindFilter = "all" | "customers" | "sub_dealers" | "suppliers";

const matchesKind: Record<KindFilter, (p: PartyWithBalance) => boolean> = {
  all: () => true,
  customers: (p) => p.kind === "customer" || p.kind === "cash",
  sub_dealers: (p) => p.kind === "sub_dealer",
  suppliers: (p) => p.kind === "company" || p.kind === "lorry_owner",
};

const overLimit = (p: PartyWithBalance) => p.creditLimit !== null && p.balance > p.creditLimit;

function StatusChips({ party }: { party: PartyWithBalance }) {
  if (overLimit(party)) return <Chip tone="danger">Over limit</Chip>;
  if (party.overdue30 > 0) return <Chip tone="warning">Overdue</Chip>;
  return null;
}

export function PartiesList({ parties, staff }: { parties: PartyWithBalance[]; staff: Record<string, string> }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");

  const q = query.trim().toLowerCase();
  const rows = parties.filter(
    (p) =>
      matchesKind[kind](p) &&
      (!q || `${p.name} ${p.place ?? ""} ${p.gstin ?? ""} ${p.mobile ?? ""}`.toLowerCase().includes(q)),
  );

  const receivable = parties.filter((p) => p.balance > 0).reduce((s, p) => s + p.balance, 0);
  const payable = parties.filter((p) => p.balance < 0).reduce((s, p) => s - p.balance, 0);
  const count = (k: KindFilter) => parties.filter(matchesKind[k]).length;

  return (
    <div className="space-y-4">
      <StatRow>
        <StatCard label="To receive" value={formatINR(receivable)} />
        <StatCard label="To pay" value={formatINR(payable)} />
        <StatCard label="Over limit" value={parties.filter(overLimit).length} tone="danger" hint="parties" />
      </StatRow>

      <DataTools title="Parties" dated={false} />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <FilterChips
          label="Party type"
          value={kind}
          onChange={setKind}
          options={[
            { value: "all", label: "All", count: count("all") },
            { value: "customers", label: "Customers", count: count("customers") },
            { value: "sub_dealers", label: "Sub-dealers", count: count("sub_dealers") },
            { value: "suppliers", label: "Suppliers", count: count("suppliers") },
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search name, place or GSTIN" className="md:w-80" />
      </div>

      <DataTable
        rows={rows}
        rowKey={(p) => p.id}
        rowHref={(p) => `/parties/${p.id}`}
        empty="No parties match your search."
        mobile={(p) => ({
          title: (
            <>
              {p.name}
              <SampleTag record={p} />
            </>
          ),
          subtitle: [p.place, partyKindLabels[p.kind]].filter(Boolean).join(" · "),
          value: formatBalance(p.balance),
          meta: <StatusChips party={p} />,
        })}
        columns={[
          {
            key: "name",
            header: "Party",
            cell: (p) => (
              <>
                {p.name}
                <SampleTag record={p} />
              </>
            ),
          },
          { key: "place", header: "Place", cell: (p) => p.place ?? "–", className: "text-ink-secondary" },
          { key: "kind", header: "Type", cell: (p) => partyKindLabels[p.kind], className: "text-ink-secondary" },
          {
            key: "staff",
            header: "Staff",
            cell: (p) => (p.assignedTo ? staff[p.assignedTo] : "–"),
            className: "hidden text-ink-secondary lg:table-cell",
          },
          {
            key: "limit",
            header: "Credit limit",
            align: "right",
            cell: (p) => (p.creditLimit === null ? "–" : formatINR(p.creditLimit)),
            className: "hidden lg:table-cell",
          },
          { key: "balance", header: "Balance", align: "right", cell: (p) => formatBalance(p.balance) },
          { key: "status", header: "", cell: (p) => <StatusChips party={p} /> },
        ]}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { StatCard, StatRow } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/ui/data-table";
import { FilterChips, SearchInput } from "@/components/ui/filters";
import type { Order, OrderStatus, Product } from "@/lib/data/types";
import { formatDate, formatShortDate } from "@/lib/format";
import { orderStatus } from "@/lib/labels";
import { describeQuantities } from "@/lib/quantities";

type Row = Omit<Order, "lines"> & { partyName: string; takenByName: string; lines: { productId: string; qty: number; dispatched: number }[] };
type View = "pending" | OrderStatus | "all";

const isPending = (o: Row) => o.status === "new" || o.status === "confirmed" || o.status === "partly_dispatched";

export function OrdersBoard({ orders, products, today }: { orders: Row[]; products: Product[]; today: string }) {
  const [view, setView] = useState<View>("pending");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rows = orders.filter(
    (o) =>
      (view === "all" ? true : view === "pending" ? isPending(o) : o.status === view) &&
      (!q || `${o.partyName} ${o.orderNo} ${o.destination ?? ""}`.toLowerCase().includes(q)),
  );
  const pendingLines = orders.filter(isPending).flatMap((o) => o.lines.map((l) => ({ productId: l.productId, qty: l.qty - l.dispatched })));
  const late = orders.filter((o) => isPending(o) && o.deliverBy && o.deliverBy < today);

  return (
    <div className="space-y-4">
      <StatRow>
        <StatCard label="New today" value={orders.filter((o) => o.status === "new" && o.date === today).length} tone="warning" hint="to confirm" />
        <StatCard label="Waiting to send" value={orders.filter(isPending).length} hint={describeQuantities(pendingLines, products) || "nothing"} />
        <StatCard label="Past delivery date" value={late.length} tone={late.length ? "danger" : "good"} />
      </StatRow>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          label="Show"
          value={view}
          onChange={setView}
          options={[
            { value: "pending", label: "Pending", count: orders.filter(isPending).length },
            { value: "new", label: "New", count: orders.filter((o) => o.status === "new").length },
            { value: "confirmed", label: "Confirmed", count: orders.filter((o) => o.status === "confirmed").length },
            { value: "dispatched", label: "Dispatched" },
            { value: "all", label: "All" },
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search party, order no. or place" className="lg:w-80" />
      </div>

      <DataTable
        rows={rows}
        rowKey={(o) => o.id}
        rowHref={(o) => `/orders/${o.id}`}
        empty="No orders here."
        mobile={(o) => ({
          title: o.partyName,
          subtitle: `#${o.orderNo} · ${formatShortDate(o.date)} · ${describeQuantities(o.lines, products)}${o.deliverBy ? ` · by ${formatShortDate(o.deliverBy)}` : ""}`,
          meta: <Chip tone={orderStatus[o.status].tone}>{orderStatus[o.status].label}</Chip>,
        })}
        columns={[
          { key: "no", header: "Order", cell: (o) => `#${o.orderNo}` },
          { key: "date", header: "Date", cell: (o) => formatDate(o.date), className: "whitespace-nowrap text-ink-secondary" },
          { key: "party", header: "Party", cell: (o) => o.partyName },
          { key: "qty", header: "Quantity", cell: (o) => describeQuantities(o.lines, products), className: "whitespace-nowrap text-ink-secondary" },
          {
            key: "by",
            header: "Deliver by",
            cell: (o) =>
              o.deliverBy ? <span className={isPending(o) && o.deliverBy < today ? "text-danger" : "text-ink-secondary"}>{formatShortDate(o.deliverBy)}</span> : "–",
            className: "whitespace-nowrap",
          },
          { key: "taken", header: "Taken by", cell: (o) => o.takenByName, className: "hidden text-ink-secondary lg:table-cell" },
          { key: "status", header: "", cell: (o) => <Chip tone={orderStatus[o.status].tone}>{orderStatus[o.status].label}</Chip> },
        ]}
      />
    </div>
  );
}

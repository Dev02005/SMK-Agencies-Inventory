import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/ui/data-table";
import { DataTools } from "@/components/ui/data-tools";
import { ExportTable } from "@/components/ui/export-table";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";
import { getMyGodowns, getProducts, getProfiles, getStockBalances, getStockMovements } from "@/lib/data";
import { inDateFilter, type DatePreset } from "@/lib/date-filter";
import { formatDate, formatNumber, formatShortDate } from "@/lib/format";
import { pageDateFilter } from "@/lib/page-dates";
import { lineQty } from "@/lib/quantities";
import { toMT } from "@/lib/sales";
import { isLowStock } from "@/lib/limits";

export const metadata: Metadata = { title: "Godown stock" };

/** Proposed low-stock levels until the owner sets them per product in Settings. */

// Movements start on the last 7 days; there is one for every bill, purchase and transfer.
const movementDates: DatePreset[] = ["7d", "today", "month", "all"];

export default function StockPage({ searchParams }: PageProps<"/stock">) {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Godown stock"
        subtitle="What is in each godown right now"
        actions={
          <>
            <SampleChip />
            <ButtonLink href="/purchases/new">New purchase</ButtonLink>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <StockData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function StockData({ searchParams }: { searchParams: PageProps<"/stock">["searchParams"] }) {
  const [balances, godowns, products, all, dates, profiles] = await Promise.all([
    getStockBalances(),
    getMyGodowns(),
    getProducts(),
    getStockMovements(),
    pageDateFilter(searchParams, movementDates),
    getProfiles(),
  ]);
  const inCharge = (ids: string[] = []) => ids.map((id) => profiles.find((p) => p.id === id)?.fullName).filter(Boolean).join(", ");
  const product = (id: string) => products.find((p) => p.id === id);
  const movements = all.filter((m) => inDateFilter(m.date, dates));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {godowns.map((g) => {
          const rows = balances.filter((b) => b.godownId === g.id).sort((a, b) => a.productId.localeCompare(b.productId));
          const cementMT = rows.reduce((s, r) => s + (product(r.productId)?.unit === "bag" ? toMT(r.qty, "bag") : 0), 0);
          const steelMT = rows.reduce((s, r) => s + (product(r.productId)?.unit === "kg" ? toMT(r.qty, "kg") : 0), 0);
          return (
            <SectionCard key={g.id} title={g.name} action={<span className="text-[13px] text-ink-secondary">{formatNumber(cementMT)} MT cement · {formatNumber(steelMT)} MT steel</span>}>
              <p className="-mt-2 mb-1 text-[13px] text-ink-secondary">In-charge: {inCharge(g.inCharge) || "not assigned"}</p>
              {rows.length === 0 && <p className="py-2.5 text-[14px] text-ink-tertiary">No stock here yet.</p>}
              <ul className="divide-y divide-hairline">
                {rows.map((r) => {
                  const p = product(r.productId);
                  const low = p && isLowStock(r.qty, p.unit);
                  return (
                    <li key={r.productId} className="flex items-center gap-3 py-2.5">
                      <span className="flex-1 text-[15px] text-ink">{p?.name}</span>
                      {low && <Chip tone="warning">Low</Chip>}
                      <span className="text-right">
                        <span className={cn("block text-[15px] font-medium tabular-nums", low ? "text-warning" : "text-ink")}>{lineQty(r.qty, p)}</span>
                        <span className="block text-[12px] text-ink-secondary">{p && formatNumber(toMT(r.qty, p.unit), 2)} MT</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          );
        })}
      </div>

      <ExportTable
        title="Stock now"
        columns={["Godown", "Product", "Quantity", "MT"]}
        rows={godowns.flatMap((g) =>
          balances
            .filter((b) => b.godownId === g.id)
            .sort((a, b) => a.productId.localeCompare(b.productId))
            .map((b) => {
              const p = product(b.productId);
              return [g.name, p?.name, lineQty(b.qty, p), p ? formatNumber(toMT(b.qty, p.unit), 2) : ""];
            }),
        )}
      />

      <h2 className="pt-2 text-[22px] font-semibold tracking-[-0.3px] text-ink">Movements</h2>
      <DataTools title="Godown stock" presets={movementDates} />
      <DataTable
        rows={movements}
        empty="No stock moved in these dates."
        rowKey={(m) => m.id}
        mobile={(m) => ({
          title: product(m.productId)?.name,
          subtitle: `${formatShortDate(m.date)} · ${godowns.find((g) => g.id === m.godownId)?.name} · ${m.ref}`,
          value: <span className={m.qty > 0 ? "text-good" : undefined}>{m.qty > 0 ? "+" : "−"} {lineQty(Math.abs(m.qty), product(m.productId))}</span>,
        })}
        columns={[
          { key: "date", header: "Date", cell: (m) => formatDate(m.date), className: "whitespace-nowrap" },
          { key: "product", header: "Product", cell: (m) => product(m.productId)?.name },
          { key: "godown", header: "Godown", cell: (m) => godowns.find((g) => g.id === m.godownId)?.name, className: "text-ink-secondary" },
          { key: "ref", header: "Against", cell: (m) => m.ref, className: "text-ink-secondary" },
          {
            key: "qty",
            header: "In / out",
            align: "right",
            cell: (m) => <span className={m.qty > 0 ? "text-good" : undefined}>{m.qty > 0 ? "+" : "−"} {lineQty(Math.abs(m.qty), product(m.productId))}</span>,
          },
        ]}
      />
    </div>
  );
}

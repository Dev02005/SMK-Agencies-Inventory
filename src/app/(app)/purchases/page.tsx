import type { Metadata } from "next";
import { Chip } from "@/components/ui/chip";
import { Suspense } from "react";
import { ListSkeleton, SampleChip, StatCard, StatRow } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTools } from "@/components/ui/data-tools";
import { PageHeader } from "@/components/ui/page-header";
import { getFirms, getGodowns, getProducts, getPurchases } from "@/lib/data";
import { inDateFilter } from "@/lib/date-filter";
import { formatDate, formatINR, formatNumber, formatShortDate } from "@/lib/format";
import { pageDateFilter } from "@/lib/page-dates";
import { describeQuantities, sumQuantities } from "@/lib/quantities";
import { DeletePurchaseButton } from "./[id]/delete-purchase-button";

export const metadata: Metadata = { title: "Godown purchases" };

export default function PurchasesPage({ searchParams }: PageProps<"/purchases">) {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Godown purchases"
        subtitle="Stock bought from companies and unloaded into a godown"
        actions={
          <>
            <SampleChip />
            <ButtonLink href="/purchases/new">New purchase</ButtonLink>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <PurchasesTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function PurchasesTable({ searchParams }: { searchParams: PageProps<"/purchases">["searchParams"] }) {
  const [all, products, godowns, dates, firms] = await Promise.all([getPurchases(), getProducts(), getGodowns(), pageDateFilter(searchParams), getFirms()]);
  const firmName = (id?: string) => (firms.find((f) => f.id === id) ?? firms.find((f) => f.primary))?.name ?? "–";
  // Lorries sold straight off the truck are under Lorry purchases.
  const purchases = all.filter((p) => !p.onLorry && inDateFilter(p.receivedDate, dates));
  const qty = sumQuantities(purchases.flatMap((p) => p.lines), products);
  const godownName = (id: string) => godowns.find((g) => g.id === id)?.name ?? "–";

  return (
    <div className="space-y-4">
      <StatRow>
        <StatCard label="Purchased" value={formatINR(purchases.reduce((s, p) => s + p.total, 0))} hint={`${purchases.length} lorries`} />
        <StatCard label="Cement" value={`${formatNumber(qty.bags)} bags`} hint={`${formatNumber(qty.cementMT)} MT`} />
        <StatCard label="Steel" value={`${formatNumber(qty.steelMT)} MT`} hint={`${formatNumber(qty.kg)} kg`} />
      </StatRow>
      <DataTools title="Purchases" />
      <DataTable
        rows={purchases}
        empty="No purchases for these dates."
        rowKey={(p) => p.id}
        rowHref={(p) => `/purchases/${p.id}`}
        mobile={(p) => ({
          title: (
            <>
              {p.companyName}
              {p.demo && <Chip tone="warning" className="ml-2 h-5 px-2 align-middle text-[11px]">Sample</Chip>}
            </>
          ),
          subtitle: `Receipt #${p.purchaseNo} · ${formatShortDate(p.invoiceDate)} · ${describeQuantities(p.lines, products)}`,
          value: formatINR(p.total),
          meta: (
            <div onClick={(e) => e.stopPropagation()} className="inline-flex justify-end">
              <DeletePurchaseButton purchaseId={p.id} what={`Purchase #${p.purchaseNo}`} compact />
            </div>
          ),
        })}
        columns={[
          { key: "no", header: "Receipt no.", cell: (p) => `#${p.purchaseNo}`, className: "font-semibold text-ink whitespace-nowrap" },
          { key: "date", header: "Invoice date", cell: (p) => formatDate(p.invoiceDate), className: "whitespace-nowrap text-ink-secondary" },
          { key: "company", header: "Company", cell: (p) => (p.demo ? <>{p.companyName}<Chip tone="warning" className="ml-2 h-5 px-2 align-middle text-[11px]">Sample</Chip></> : p.companyName) },
          ...(firms.length > 1 ? [{ key: "firm", header: "For firm", cell: (p: (typeof purchases)[number]) => firmName(p.firmId), className: "hidden text-ink-secondary lg:table-cell" }] : []),
          { key: "invoice", header: "Company invoice no.", cell: (p) => p.invoiceNo, className: "hidden text-ink-secondary lg:table-cell" },
          { key: "lorry", header: "Truck number", cell: (p) => p.lorryNo, className: "hidden whitespace-nowrap text-ink-secondary lg:table-cell" },
          { key: "godown", header: "Godown", cell: (p) => godownName(p.godownId), className: "hidden text-ink-secondary xl:table-cell" },
          { key: "qty", header: "Quantity", cell: (p) => describeQuantities(p.lines, products), className: "whitespace-nowrap text-ink-secondary" },
          { key: "total", header: "Amount", align: "right", cell: (p) => formatINR(p.total) },
          {
            key: "actions",
            header: "",
            className: "w-10 text-right",
            cell: (p) => (
              <div onClick={(e) => e.stopPropagation()} className="inline-flex justify-end">
                <DeletePurchaseButton purchaseId={p.id} what={`Purchase #${p.purchaseNo}`} compact />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

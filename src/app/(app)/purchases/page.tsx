import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton, SampleChip, StatCard, StatRow } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { getGodowns, getProducts, getPurchases } from "@/lib/data";
import { formatDate, formatINR, formatNumber, formatShortDate } from "@/lib/format";
import { describeQuantities, sumQuantities } from "@/lib/quantities";

export const metadata: Metadata = { title: "Purchases" };

export default function PurchasesPage() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Purchases"
        subtitle="Stock bought from companies, by lorry"
        actions={
          <>
            <SampleChip />
            <ButtonLink href="/purchases/new">New purchase</ButtonLink>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <PurchasesTable />
      </Suspense>
    </div>
  );
}

async function PurchasesTable() {
  const [purchases, products, godowns] = await Promise.all([getPurchases(), getProducts(), getGodowns()]);
  const qty = sumQuantities(purchases.flatMap((p) => p.lines), products);
  const godownName = (id: string) => godowns.find((g) => g.id === id)?.name ?? "–";

  return (
    <div className="space-y-4">
      <StatRow>
        <StatCard label="Purchased" value={formatINR(purchases.reduce((s, p) => s + p.total, 0))} hint={`${purchases.length} lorries`} />
        <StatCard label="Cement" value={`${formatNumber(qty.bags)} bags`} hint={`${formatNumber(qty.cementMT)} MT`} />
        <StatCard label="Steel" value={`${formatNumber(qty.steelMT)} MT`} hint={`${formatNumber(qty.kg)} kg`} />
      </StatRow>
      <DataTable
        rows={purchases}
        rowKey={(p) => p.id}
        rowHref={(p) => `/purchases/${p.id}`}
        mobile={(p) => ({
          title: p.companyName,
          subtitle: `#${p.purchaseNo} · ${formatShortDate(p.invoiceDate)} · ${describeQuantities(p.lines, products)}`,
          value: formatINR(p.total),
        })}
        columns={[
          { key: "no", header: "No.", cell: (p) => `#${p.purchaseNo}` },
          { key: "date", header: "Invoice date", cell: (p) => formatDate(p.invoiceDate), className: "whitespace-nowrap text-ink-secondary" },
          { key: "company", header: "Company", cell: (p) => p.companyName },
          { key: "invoice", header: "Invoice no.", cell: (p) => p.invoiceNo, className: "hidden text-ink-secondary lg:table-cell" },
          { key: "lorry", header: "Lorry", cell: (p) => p.lorryNo, className: "hidden whitespace-nowrap text-ink-secondary lg:table-cell" },
          { key: "godown", header: "Godown", cell: (p) => godownName(p.godownId), className: "hidden text-ink-secondary xl:table-cell" },
          { key: "qty", header: "Quantity", cell: (p) => describeQuantities(p.lines, products), className: "whitespace-nowrap text-ink-secondary" },
          { key: "total", header: "Amount", align: "right", cell: (p) => formatINR(p.total) },
        ]}
      />
    </div>
  );
}

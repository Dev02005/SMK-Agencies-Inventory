import { Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OwnerOnly } from "@/components/auth/owner-only";
import { ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DataTools } from "@/components/ui/data-tools";
import { ExportTable } from "@/components/ui/export-table";
import { PageHeader } from "@/components/ui/page-header";
import { getFirms, getLorryLoads, getProducts } from "@/lib/data";
import { inDateFilter } from "@/lib/date-filter";
import { formatDate, formatNumber } from "@/lib/format";
import { pageDateFilter } from "@/lib/page-dates";
import { lineQty } from "@/lib/quantities";
import { DeviceLorryPurchases } from "./device-lorry-purchases";

export const metadata: Metadata = { title: "Lorry purchases" };

/**
 * Company lorries bought to be sold straight off the truck: who sent them, the invoice and what came on them. Their
 * bills are under Sales › Lorry sales. Only the owner deals in lorries.
 */
export default function LorryPurchasesPage({ searchParams }: PageProps<"/purchases/lorries">) {
  return (
    <div className="animate-fade-up">
      <Suspense fallback={<ListSkeleton />}>
        <OwnerOnly what="lorry purchases">
          <PageHeader
            title="Lorry purchases"
            subtitle="Company lorries bought to sell straight off the truck"
            actions={
              <>
                <SampleChip />
                <ButtonLink href="/purchases/lorries/new">New lorry purchase</ButtonLink>
              </>
            }
          />
          <Suspense fallback={<ListSkeleton />}>
            <Loads searchParams={searchParams} />
          </Suspense>
        </OwnerOnly>
      </Suspense>
    </div>
  );
}

async function Loads({ searchParams }: { searchParams: PageProps<"/purchases/lorries">["searchParams"] }) {
  const [all, products, dates, firms] = await Promise.all([getLorryLoads(), getProducts(), pageDateFilter(searchParams), getFirms()]);
  const loads = all.filter((l) => inDateFilter(l.arrivedOn, dates));
  const product = (id: string) => products.find((p) => p.id === id);
  return (
    <div className="space-y-4">
      <DataTools title="Lorry purchases" />
      <ExportTable
        title="Lorry purchases"
        columns={["Arrived", "Lorry", "Company", "Driver", "Invoice", "Item", "Loaded"]}
        rows={loads.flatMap((l) =>
          l.lines.map((x) => [formatDate(l.arrivedOn), l.lorryNo, l.companyName, l.driverName, l.invoiceNo, product(x.productId)?.name, lineQty(x.loaded, product(x.productId))]),
        )}
      />
      <DeviceLorryPurchases products={products} firmNames={Object.fromEntries(firms.map((f) => [f.id, f.name]))} serverCount={loads.length} />
      {loads.map((load) => (
        <SectionCard
          key={load.id}
          title={
            <span className="flex items-center gap-2">
              <Truck size={20} strokeWidth={1.75} className="text-warning" aria-hidden />
              {load.lorryNo}
            </span>
          }
          action={<Chip tone={load.status === "selling" ? "warning" : "good"}>{load.status === "selling" ? "Selling" : "Sold out"}</Chip>}
        >
          <p className="-mt-2 text-[13px] text-ink-secondary">
            {load.companyName}
            {load.driverName && ` · driver ${load.driverName}`} · {load.invoiceNo ? `invoice ${load.invoiceNo}` : "no invoice number"} · arrived {formatDate(load.arrivedOn)} ·{" "}
            <Link href={`/purchases/${load.purchaseId}`} className="text-link underline underline-offset-2">
              purchase
            </Link>
          </p>
          <ul className="mt-3 divide-y divide-hairline">
            {load.lines.map((l) => (
              <li key={l.productId} className="flex justify-between py-2 text-[15px]">
                <span className="text-ink">{product(l.productId)?.name}</span>
                <span className="tabular-nums text-ink">{lineQty(l.loaded, product(l.productId))}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-ink-secondary">
            {formatNumber(load.bills.length)} {load.bills.length === 1 ? "bill" : "bills"} so far ·{" "}
            <Link href="/sales/lorries" className="text-link hover:underline">
              Lorry sales ›
            </Link>
          </p>
        </SectionCard>
      ))}
    </div>
  );
}

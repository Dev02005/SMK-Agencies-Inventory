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
import { getLorryLoads, getToday } from "@/lib/data";
import { inDateFilter } from "@/lib/date-filter";
import { formatDate, formatINR, formatNumber, formatShortDate } from "@/lib/format";
import { pageDateFilter } from "@/lib/page-dates";
import { CloseLorry, DeviceLorries, SellOut } from "./lorry-cards";

export const metadata: Metadata = { title: "Lorry sales" };

/**
 * Company lorries being sold straight off the truck: the bills made from each, then closing it. Only the owner sees
 * lorry sales. New lorries are noted under Purchases › Lorry purchases; bags left are under Stock › Lorry stock.
 */
export default function LorrySalesPage({ searchParams }: PageProps<"/sales/lorries">) {
  return (
    <div className="animate-fade-up">
      <Suspense fallback={<ListSkeleton />}>
        <OwnerOnly what="lorry sales">
          <PageHeader
            title="Lorry sales"
            subtitle="Company lorries sold straight off the truck"
            actions={
              <>
                <SampleChip />
                <ButtonLink href="/purchases/lorries" variant="secondary">
                  Lorry purchases
                </ButtonLink>
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

async function Loads({ searchParams }: { searchParams: PageProps<"/sales/lorries">["searchParams"] }) {
  const [all, today, dates] = await Promise.all([getLorryLoads(), getToday(), pageDateFilter(searchParams)]);
  const loads = all.filter((l) => inDateFilter(l.arrivedOn, dates));
  return (
    <div className="space-y-4">
      <DataTools title="Lorry sales" />
      <ExportTable
        title="Bills from company lorries"
        columns={["Lorry", "Company", "Arrived", "Bill", "Date", "Party", "Bags", "Total"]}
        rows={loads.flatMap((l) =>
          l.bills.map((b) => [l.lorryNo, l.companyName, formatDate(l.arrivedOn), `#${b.billNo}`, formatDate(b.date), b.partyName, formatNumber(b.qty), formatINR(b.total)]),
        )}
      />
      <DeviceLorries today={today} serverCount={loads.length} />
      {loads.map((load) => (
        <SectionCard
          key={load.id}
          title={
            <span className="flex items-center gap-2">
              <Truck size={20} strokeWidth={1.75} className="text-warning" aria-hidden />
              {load.lorryNo}
            </span>
          }
          action={<Chip tone={load.status === "selling" ? "warning" : "good"}>{load.status === "selling" ? "Selling" : "Closed"}</Chip>}
        >
          <p className="-mt-2 text-[13px] text-ink-secondary">
            {load.companyName}
            {load.driverName && ` · driver ${load.driverName}`} · {load.invoiceNo ? `invoice ${load.invoiceNo}` : "no invoice number"} · arrived{" "}
            {formatDate(load.arrivedOn)}
          </p>
          <SellOut arrivedOn={load.arrivedOn} days={load.sellOutDays} today={today} selling={load.status === "selling"} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone={load.invoicePaperKept ? "good" : "neutral"}>{load.invoicePaperKept ? "Invoice paper with us" : "No invoice paper"}</Chip>
            <Chip tone={load.unloadingCharges ? "warning" : "neutral"}>{load.unloadingCharges ? "Unloading charges" : "No unloading charges"}</Chip>
          </div>

          <h3 className="mt-5 text-[15px] font-semibold text-ink">Sold from this lorry</h3>
          {load.bills.length === 0 ? (
            <p className="mt-1 text-[14px] text-ink-secondary">No bills yet.</p>
          ) : (
            <ul className="mt-1 divide-y divide-hairline">
              {load.bills.map((b) => (
                <li key={b.id}>
                  <Link href={`/sales/${b.id}`} className="flex items-center gap-3 py-2.5">
                    <span className="w-14 shrink-0 text-[13px] text-ink-secondary">{formatShortDate(b.date)}</span>
                    <span className="min-w-0 flex-1 truncate text-[15px] text-ink">
                      Bill {b.billNo} · {b.partyName}
                    </span>
                    <span className="text-[13px] text-ink-secondary">{formatNumber(b.qty)} bags</span>
                    <span className="w-24 text-right text-[15px] tabular-nums text-ink">{formatINR(b.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {load.status === "selling" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonLink href={`/sales/new?lorry=${load.id}`}>Sell from this lorry</ButtonLink>
              <CloseLorry id={load.id} local={false} today={today} />
            </div>
          )}
        </SectionCard>
      ))}
    </div>
  );
}

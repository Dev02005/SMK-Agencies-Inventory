import { Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { SampleActionButton } from "@/components/ui/sample-action";
import { getLorryLoads, getProducts } from "@/lib/data";
import { formatDate, formatINR, formatNumber, formatShortDate } from "@/lib/format";
import { lineQty } from "@/lib/quantities";

export const metadata: Metadata = { title: "Lorry stock" };

export default function LorryStockPage() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Lorry stock"
        subtitle="Company lorries sold straight off the truck, without unloading into a godown"
        actions={<SampleChip />}
      />
      <Suspense fallback={<ListSkeleton />}>
        <Loads />
      </Suspense>
    </div>
  );
}

async function Loads() {
  const [loads, products] = await Promise.all([getLorryLoads(), getProducts()]);
  if (loads.length === 0) return <SectionCard>No lorry is selling right now.</SectionCard>;
  return (
    <div className="space-y-4">
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
            {load.companyName} · arrived {formatDate(load.arrivedOn)} ·{" "}
            <Link href={`/purchases/${load.purchaseId}`} className="text-link underline underline-offset-2">
              purchase
            </Link>
          </p>
          <div className="mt-4 space-y-3">
            {load.lines.map((l) => {
              const p = products.find((x) => x.id === l.productId);
              return (
                <div key={l.productId}>
                  <div className="flex justify-between text-[15px]">
                    <span className="text-ink">{p?.name}</span>
                    <span className="tabular-nums text-ink">
                      <span className="font-semibold">{lineQty(l.left, p)}</span> left of {formatNumber(l.loaded)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-hairline" role="img" aria-label={`${l.sold} sold of ${l.loaded}`}>
                    <div className="h-full bg-warning" style={{ width: `${(l.sold / l.loaded) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <h3 className="mt-5 text-[15px] font-semibold text-ink">Sold from this lorry</h3>
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
          {load.status === "selling" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonLink href="/sales/new">Sell from this lorry</ButtonLink>
              <SampleActionButton message="Sample mode: the lorry would be closed: what's left is unloaded into a godown and shortages recorded.">
                Close lorry
              </SampleActionButton>
            </div>
          )}
        </SectionCard>
      ))}
    </div>
  );
}

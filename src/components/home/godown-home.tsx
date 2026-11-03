import { Truck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AttendanceChip } from "@/components/people/attendance-chip";
import { ListSkeleton, SampleChip, SectionCard, StatCard, StatRow } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { SampleActionButton } from "@/components/ui/sample-action";
import { getGodownHome, getProducts } from "@/lib/data";
import { formatShortDate } from "@/lib/format";
import { orderStatus } from "@/lib/labels";
import { describeQuantities, lineQty } from "@/lib/quantities";
import { isLowStock } from "@/lib/limits";
import { TodayLine } from "./owner-home";


/** Godown in-charge: bills to load, today's company lorries, stock and orders waiting. */
export function GodownHome() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Godown today"
        subtitle={
          <Suspense fallback={null}>
            <TodayLine />
          </Suspense>
        }
        actions={
          <>
            <SampleChip />
            <ButtonLink href="/purchases/new">New purchase</ButtonLink>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <GodownDay />
      </Suspense>
    </div>
  );
}

async function GodownDay() {
  const [d, products] = await Promise.all([getGodownHome(), getProducts()]);
  const lowCount = d.stock.flatMap((g) => g.items).filter((i) => isLowStock(i.qty, i.product.unit)).length;

  return (
    <div className="space-y-4">
      <StatRow>
        <StatCard label="Bills to load" value={d.toLoad.length} hint={describeQuantities(d.toLoad.flatMap((b) => b.lines), products)} />
        <StatCard label="Company lorries today" value={d.lorriesToday.length} />
        <StatCard label="Low stock" value={lowCount} tone={lowCount ? "warning" : "good"} hint="items" />
      </StatRow>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Load now" action={<AttendanceChip record={d.attendance} />}>
          {d.toLoad.length === 0 ? (
            <p className="py-2 text-[15px] text-ink-secondary">No bills waiting.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {d.toLoad.map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/sales/${b.id}`} className="block truncate text-[15px] text-ink hover:text-link">
                      Bill {b.billNo} · {b.partyName}
                    </Link>
                    <p className="text-[13px] text-ink-secondary">
                      {describeQuantities(b.lines, products)} · {b.godownName}
                    </p>
                  </div>
                  <Chip tone={b.transportMode === "EX" ? "neutral" : "accent"}>{b.transportMode === "EX" ? "Party's vehicle" : "Our lorry"}</Chip>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Company lorries today">
          {d.lorriesToday.length === 0 ? (
            <p className="py-2 text-[15px] text-ink-secondary">None today.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {d.lorriesToday.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <Truck size={20} strokeWidth={1.75} className="shrink-0 text-warning" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] text-ink">
                      {p.lorryNo} · {p.companyName}
                    </p>
                    <p className="text-[13px] text-ink-secondary">
                      {describeQuantities(p.lines, products)} → {p.godownName}
                    </p>
                  </div>
                  <ButtonLink href={`/purchases/${p.id}`} variant="secondary" className="h-9 px-4 text-[14px]">
                    View
                  </ButtonLink>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {d.stock.map((g) => (
          <SectionCard key={g.id} title={g.name}>
            <ul className="divide-y divide-hairline">
              {g.items.map((i) => {
                const low = isLowStock(i.qty, i.product.unit);
                return (
                  <li key={i.productId} className="flex items-center gap-3 py-2.5">
                    <span className="flex-1 text-[15px] text-ink">{i.product.name}</span>
                    {low && <Chip tone="warning">Low</Chip>}
                    <span className="text-[15px] font-medium tabular-nums text-ink">{lineQty(i.qty, i.product)}</span>
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        ))}

        <SectionCard
          title="Orders waiting to go"
          className="lg:col-span-2"
          action={
            <Link href="/orders" className="text-[15px] text-link hover:underline">
              All orders ›
            </Link>
          }
        >
          <ul className="divide-y divide-hairline">
            {d.pendingOrders.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-3">
                <Link href={`/orders/${o.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-[15px] text-ink">{o.partyName}</p>
                  <p className="text-[13px] text-ink-secondary">
                    {describeQuantities(
                      o.lines.map((l) => ({ productId: l.productId, qty: l.qty - l.dispatched })),
                      products,
                    )}
                    {o.deliverBy && ` · by ${formatShortDate(o.deliverBy)}`}
                  </p>
                </Link>
                <Chip tone={orderStatus[o.status].tone}>{orderStatus[o.status].label}</Chip>
                <SampleActionButton variant="secondary" className="h-9 px-4 text-[14px]" message="Sample mode: the godown would mark this order's stock as kept aside.">
                  Keep aside
                </SampleActionButton>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

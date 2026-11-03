import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListSkeleton, SampleChip, StatCard, StatRow } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { DataTools } from "@/components/ui/data-tools";
import { ExportTable } from "@/components/ui/export-table";
import { PageHeader } from "@/components/ui/page-header";
import { getProducts, getTrips } from "@/lib/data";
import { inDateFilter } from "@/lib/date-filter";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { pageDateFilter } from "@/lib/page-dates";
import { describeQuantities } from "@/lib/quantities";
import { OwnerPage } from "@/components/auth/owner-only";

export const metadata: Metadata = { title: "Trips" };

function TripsPageContent({ searchParams }: PageProps<"/fleet/trips">) {
  return (
    <>
      <PageHeader title="Trips" subtitle="Our lorry's delivery runs: stops, km, freight charged and diesel spent" actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton />}>
        <TripList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function TripList({ searchParams }: { searchParams: PageProps<"/fleet/trips">["searchParams"] }) {
  const [all, products, dates] = await Promise.all([getTrips(), getProducts(), pageDateFilter(searchParams)]);
  const trips = all.filter((t) => inDateFilter(t.date, dates));
  const done = trips.filter((t) => t.status === "completed");
  const km = done.reduce((s, t) => s + (t.km ?? 0), 0);
  const freight = trips.reduce((s, t) => s + t.freightCharged, 0);
  const fuel = trips.reduce((s, t) => s + t.fuel, 0);

  return (
    <div className="space-y-4">
      <StatRow>
        <StatCard label="Trips" value={trips.length} hint={`${formatNumber(km)} km`} />
        <StatCard label="Freight charged" value={formatINR(freight)} tone="good" />
        <StatCard label="Diesel on trip days" value={formatINR(fuel)} hint={freight ? `${Math.round((fuel / freight) * 100)}% of freight` : undefined} />
      </StatRow>
      <DataTools title="Trips" />
      {trips.length === 0 && <p className="surface px-5 py-12 text-center text-[15px] text-ink-secondary">No trips for these dates.</p>}
      <ExportTable
        columns={["Date", "Vehicle", "Driver", "Stops", "Km", "Freight", "Diesel", "Status"]}
        rows={trips.map((t) => [
          formatDate(t.date),
          t.vehicleLabel,
          t.driverName,
          t.stops.map((s) => `${s.partyName} (${s.destination})`).join(", "),
          t.km !== undefined ? formatNumber(t.km) : "",
          formatINR(t.freightCharged),
          formatINR(t.fuel),
          t.status === "on_the_way" ? "On the way" : "Completed",
        ])}
      />
      {trips.map((t) => (
        <section key={t.id} className="surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[17px] font-semibold tracking-[-0.3px] text-ink">{formatDate(t.date)}</p>
              <p className="text-[13px] text-ink-secondary">
                {t.vehicleLabel} · {t.driverName} · {t.stops.length} stop{t.stops.length === 1 ? "" : "s"}
                {t.km !== undefined && ` · ${formatNumber(t.km)} km (${formatNumber(t.startKm)} → ${formatNumber(t.endKm ?? 0)})`}
              </p>
            </div>
            {t.status === "on_the_way" ? <Chip tone="accent">On the way</Chip> : <Chip tone="good">Completed</Chip>}
          </div>
          <ol className="mt-3 space-y-1.5">
            {t.stops.map((s, i) => (
              <li key={s.saleId} className="flex items-center gap-3 text-[15px]">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-teal/10 text-[12px] font-semibold text-teal">{i + 1}</span>
                <Link href={`/sales/${s.saleId}`} className="min-w-0 flex-1 truncate text-ink hover:text-link">
                  {s.partyName} · {s.destination}
                </Link>
                <span className="hidden text-[13px] text-ink-secondary sm:inline">{describeQuantities(s.lines, products)}</span>
                <span className="w-20 text-right tabular-nums text-ink">{formatINR(s.freight)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 border-t border-hairline pt-3 text-[13px] text-ink-secondary">
            Freight {formatINR(t.freightCharged)} · diesel {formatINR(t.fuel)}
          </p>
        </section>
      ))}
    </div>
  );
}

export default function TripsPage(props: PageProps<"/fleet/trips">) {
  return (
    <OwnerPage what="vehicles">
      <TripsPageContent {...props} />
    </OwnerPage>
  );
}

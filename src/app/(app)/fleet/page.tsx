import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { categoryLabel, DueChip, GpsChip, kindIcon } from "@/components/fleet/fleet-bits";
import { ListSkeleton, SampleChip, StatCard, StatRow } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { getVehicles } from "@/lib/data";
import { formatINR, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Vehicles" };

export default function VehiclesPage() {
  return (
    <>
      <PageHeader title="Vehicles" subtitle="Renewals, service and running cost for every vehicle" actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton />}>
        <VehicleList />
      </Suspense>
    </>
  );
}

async function VehicleList() {
  const vehicles = await getVehicles();
  const renewals = vehicles.flatMap((v) => v.renewals);
  const serviceDue = vehicles.filter((v) => v.serviceDueInKm !== undefined && v.nextServiceKm > 0 && v.serviceDueInKm <= 1000);

  return (
    <div className="space-y-4">
      <StatRow>
        <StatCard label="Renewals in 30 days" value={renewals.filter((r) => r.daysLeft >= 0 && r.daysLeft <= 30).length} tone="warning" />
        <StatCard label="Expired papers" value={renewals.filter((r) => r.daysLeft < 0).length} tone="danger" />
        <StatCard label="Service due" value={serviceDue.length} hint="within 1,000 km" />
      </StatRow>
      <ul className="grid gap-4 md:grid-cols-2">
        {vehicles.map((v) => {
          const Icon = kindIcon[v.kind];
          return (
            <li key={v.id}>
              <Link href={`/fleet/${v.id}`} className="surface block p-5 transition hover:shadow-raised">
                <div className="flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-teal/10 text-teal">
                    <Icon size={22} strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="text-[17px] font-semibold tracking-[-0.3px] text-ink">{v.number}</span>
                      <Chip>{categoryLabel[v.category]}</Chip>
                    </p>
                    <p className="text-[13px] text-ink-secondary">
                      {v.model}
                      {v.capacityMT && ` · ${v.capacityMT} MT`}
                      {v.driverName && ` · ${v.driverName}`}
                      {v.ownerName && ` · ${v.ownerName}`}
                    </p>
                  </div>
                  <ChevronRight size={18} strokeWidth={1.75} className="mt-1 text-ink-tertiary" aria-hidden />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {v.nextRenewal && <DueChip label={v.nextRenewal.label} daysLeft={v.nextRenewal.daysLeft} />}
                  {v.serviceDueInKm !== undefined && v.nextServiceKm > 0 && (
                    <Chip tone={v.serviceDueInKm <= 1000 ? "warning" : "neutral"}>Service in {formatNumber(v.serviceDueInKm)} km</Chip>
                  )}
                  {(v.kind === "lorry" || v.kind === "van") && v.category !== "rented" && <GpsChip gps={v.gps} />}
                </div>
                {v.monthCost > 0 && <p className="mt-3 text-[13px] text-ink-secondary">This month: {formatINR(v.monthCost)} on fuel and repairs</p>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

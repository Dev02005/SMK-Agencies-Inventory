import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { categoryLabel, DueChip, GpsChip, kindIcon } from "@/components/fleet/fleet-bits";
import { ListSkeleton, SampleTag, StatCard, StatRow } from "@/components/ui/blocks";
import { DataOrigin } from "@/components/ui/data-origin";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { getVehicles } from "@/lib/data";
import { formatINR, formatNumber } from "@/lib/format";
import { OwnerPage } from "@/components/auth/owner-only";

export const metadata: Metadata = { title: "Vehicles" };

function VehiclesPageContent() {
  return (
    <>
      <PageHeader title="Vehicles" subtitle="Renewals, service and running cost for every vehicle" actions={<DataOrigin of="vehicles" />} />
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
  // Our commercial lorries and vans, the cars and bikes for personal use, and the rented ones (each with its own driver).
  const rented = vehicles.filter((v) => v.category === "rented");
  const commercial = vehicles.filter((v) => v.category !== "rented" && (v.kind === "lorry" || v.kind === "van"));
  const personal = vehicles.filter((v) => v.category !== "rented" && (v.kind === "car" || v.kind === "bike"));

  return (
    <div className="space-y-4">
      <StatRow>
        <StatCard label="Renewals in 30 days" value={renewals.filter((r) => r.daysLeft >= 0 && r.daysLeft <= 30).length} tone="warning" />
        <StatCard label="Expired papers" value={renewals.filter((r) => r.daysLeft < 0).length} tone="danger" />
        <StatCard label="Service due" value={serviceDue.length} hint="within 1,000 km" />
      </StatRow>
      <VehicleGroup title="Commercial vehicles" vehicles={commercial} empty="No commercial vehicles yet." />
      <VehicleGroup title="Rented vehicles" vehicles={rented} empty="No rented vehicles yet." />
      <VehicleGroup title="Cars & bikes (personal)" vehicles={personal} empty="No cars or bikes yet." />
    </div>
  );
}

type VehicleRow = Awaited<ReturnType<typeof getVehicles>>[number];

function VehicleGroup({ title, vehicles, empty }: { title: string; vehicles: VehicleRow[]; empty: string }) {
  return (
    <section className="space-y-3 pt-2">
      <h2 className="flex items-baseline gap-2 text-[20px] font-semibold tracking-[-0.3px] text-ink">
        {title}
        <span className="text-[15px] font-normal text-ink-secondary">{vehicles.length}</span>
      </h2>
      {vehicles.length === 0 ? (
        <p className="surface px-5 py-6 text-[15px] text-ink-secondary">{empty}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {vehicles.map((v) => (
            <VehicleCard key={v.id} v={v} />
          ))}
        </ul>
      )}
    </section>
  );
}

function VehicleCard({ v }: { v: VehicleRow }) {
  const Icon = kindIcon[v.kind];
  return (
    <li>
      <Link href={`/fleet/${v.id}`} className="surface block p-5 transition hover:shadow-raised">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-teal/10 text-teal">
            <Icon size={22} strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-[17px] font-semibold tracking-[-0.3px] text-ink">{v.number}</span>
              <Chip>{v.category !== "rented" && (v.kind === "car" || v.kind === "bike") ? "Personal" : v.category === "own" ? "Commercial" : categoryLabel[v.category]}</Chip>
              <SampleTag record={v} />
            </p>
            <p className="text-[13px] text-ink-secondary">
              {[v.model, v.capacityMT && `${v.capacityMT} MT`, v.driverName, v.rentDriver?.mobile && `+91 ${v.rentDriver.mobile}`, v.ownerName].filter(Boolean).join(" · ") || "Details not added yet"}
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
}

export default function VehiclesPage() {
  return (
    <OwnerPage what="vehicles">
      <VehiclesPageContent />
    </OwnerPage>
  );
}

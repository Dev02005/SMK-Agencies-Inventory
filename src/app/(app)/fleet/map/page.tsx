import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GpsChip, kindIcon } from "@/components/fleet/fleet-bits";
import { ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getFleetMap } from "@/lib/data";
import { FleetMap } from "./fleet-map";
import { OwnerPage } from "@/components/auth/owner-only";

export const metadata: Metadata = { title: "Vehicle map" };

function MapPageContent() {
  return (
    <>
      <PageHeader
        title="Vehicle map"
        subtitle="Where each vehicle with a GPS device is, and the lorry's route today"
        actions={<SampleChip />}
      />
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <MapData />
      </Suspense>
    </>
  );
}

async function MapData() {
  const { vehicles, route, places } = await getFleetMap();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <FleetMap
          vehicles={vehicles.map((v) => ({ id: v.id, label: v.number, ...v.gps! }))}
          route={route}
          places={places}
        />
        <p className="mt-2 px-1 text-[13px] text-ink-secondary">
          Positions here are sample data. Live tracking needs a GPS device in each vehicle and a tracking provider; the plan&apos;s Phase 4 covers choosing one.
        </p>
      </div>
      <SectionCard title="Vehicles">
        <ul className="divide-y divide-hairline">
          {vehicles.map((v) => {
            const Icon = kindIcon[v.kind];
            return (
              <li key={v.id}>
                <Link href={`/fleet/${v.id}`} className="flex items-start gap-3 py-3">
                  <Icon size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-teal" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] text-ink">{v.number}</span>
                    <span className="block text-[13px] text-ink-secondary">
                      {v.gps!.place} · updated {v.gps!.updatedAt}
                    </span>
                    <span className="mt-1 block">
                      <GpsChip gps={v.gps} />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[12px] text-ink-tertiary">Cars and bikes have no GPS.</p>
      </SectionCard>
    </div>
  );
}

export default function MapPage() {
  return (
    <OwnerPage what="vehicles">
      <MapPageContent />
    </OwnerPage>
  );
}

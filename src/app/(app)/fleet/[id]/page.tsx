import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { categoryLabel, DueChip, GpsChip } from "@/components/fleet/fleet-bits";
import { SimpleForm } from "@/components/forms/simple-form";
import { BackLink, DetailList, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { DataTable } from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import { PageHeader } from "@/components/ui/page-header";
import { getVehicle } from "@/lib/data";
import { formatDate, formatINR, formatNumber, formatShortDate } from "@/lib/format";
import { expenseHeadLabels } from "@/lib/labels";

export const metadata: Metadata = { title: "Vehicle" };

const serviceKind = { service: "Service", oil: "Engine oil", tyres: "Tyres", brakes: "Brakes", battery: "Battery", repair: "Repair" } as const;

export default function VehiclePage({ params }: PageProps<"/fleet/[id]">) {
  return (
    <>
      <BackLink href="/fleet">Vehicles</BackLink>
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <VehicleDetail params={params} />
      </Suspense>
    </>
  );
}

async function VehicleDetail({ params }: { params: PageProps<"/fleet/[id]">["params"] }) {
  const { id } = await params;
  const v = await getVehicle(id);
  if (!v) notFound();

  return (
    <>
      <PageHeader title={v.number} subtitle={[v.model, categoryLabel[v.category], v.driverName, v.ownerName].filter(Boolean).join(" · ")} actions={
          <>
            <SampleChip />
            <ExportMenu title={`Vehicle ${v.number}`} />
          </>
        } />
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Papers">
          {v.renewals.length === 0 ? (
            <p className="text-[15px] text-ink-secondary">Kept by the owner of this rented lorry.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {v.renewals.map((r) => (
                <li key={r.doc} className="flex items-center justify-between gap-3 py-2.5">
                  <span>
                    <span className="block text-[15px] text-ink">{r.label}</span>
                    <span className="block text-[12px] text-ink-secondary">Due {formatDate(r.due)}</span>
                  </span>
                  <DueChip daysLeft={r.daysLeft} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard title="Health" action={(v.kind === "lorry" || v.kind === "van") && v.category !== "rented" ? <GpsChip gps={v.gps} /> : undefined}>
          <DetailList
            items={[
              { label: "Odometer", value: v.odometer ? `${formatNumber(v.odometer)} km` : undefined },
              { label: "Next service", value: v.nextServiceKm ? `at ${formatNumber(v.nextServiceKm)} km (${formatNumber(v.serviceDueInKm ?? 0)} to go)` : undefined },
              { label: "Last service", value: v.lastService && `${formatDate(v.lastService.date)} · ${serviceKind[v.lastService.kind]}` },
              { label: "Tyres changed", value: v.tyresChangedOn && formatDate(v.tyresChangedOn) },
              { label: "Capacity", value: v.capacityMT && `${v.capacityMT} MT` },
              { label: "Last seen", value: v.gps && `${v.gps.place} · ${v.gps.updatedAt}` },
            ]}
          />
          {v.gps && (
            <Link href="/fleet/map" className="mt-2 inline-block text-[15px] text-link hover:underline">
              Show on map ›
            </Link>
          )}
        </SectionCard>
        <SectionCard title="Running cost this month">
          <p className="text-[34px] font-semibold leading-[41px] tracking-[-0.4px] tabular-nums text-ink">{formatINR(v.monthCost)}</p>
          <p className="text-[13px] text-ink-secondary">Fuel, repairs and other expenses charged to this vehicle</p>
          {v.trips.length > 0 && <p className="mt-2 text-[13px] text-ink-secondary">{v.trips.length} delivery trips in the last two weeks</p>}
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          <h2 className="text-[22px] font-semibold tracking-[-0.3px] text-ink">Service log</h2>
          <DataTable
            rows={v.services}
            rowKey={(s) => s.id}
            empty="No service records yet."
            mobile={(s) => ({ title: `${serviceKind[s.kind]} · ${s.garage}`, subtitle: `${formatShortDate(s.date)} · ${formatNumber(s.odometer)} km${s.notes ? ` · ${s.notes}` : ""}`, value: formatINR(s.cost) })}
            columns={[
              { key: "date", header: "Date", cell: (s) => formatDate(s.date), className: "whitespace-nowrap text-ink-secondary" },
              { key: "kind", header: "Work", cell: (s) => serviceKind[s.kind] },
              { key: "km", header: "Km", align: "right", cell: (s) => formatNumber(s.odometer) },
              { key: "garage", header: "Garage", cell: (s) => s.garage, className: "hidden text-ink-secondary lg:table-cell" },
              { key: "cost", header: "Cost", align: "right", cell: (s) => formatINR(s.cost) },
            ]}
          />
          {v.expenses.length > 0 && (
            <>
              <h2 className="pt-2 text-[22px] font-semibold tracking-[-0.3px] text-ink">Expenses</h2>
              <DataTable
                rows={[...v.expenses].reverse().slice(0, 15)}
                rowKey={(e) => e.id}
                mobile={(e) => ({ title: e.description, subtitle: `${formatShortDate(e.date)} · ${expenseHeadLabels[e.head]}`, value: formatINR(e.amount) })}
                columns={[
                  { key: "date", header: "Date", cell: (e) => formatDate(e.date), className: "whitespace-nowrap text-ink-secondary" },
                  { key: "head", header: "Head", cell: (e) => expenseHeadLabels[e.head] },
                  { key: "what", header: "Description", cell: (e) => e.description, className: "text-ink-secondary" },
                  { key: "amount", header: "Amount", align: "right", cell: (e) => formatINR(e.amount) },
                ]}
              />
            </>
          )}
        </div>
        <SectionCard title="Add to the service log" className="lg:col-span-2">
          <SimpleForm
            thing="service record"
            submitLabel="Save record"
            fields={[
              { name: "kind", label: "Work done", type: "select", options: Object.entries(serviceKind).map(([value, label]) => ({ value, label })), wide: true },
              { name: "date", label: "Date", type: "date" },
              { name: "km", label: "Odometer (km)", type: "number", required: true },
              { name: "cost", label: "Cost", type: "number", prefix: "₹", required: true },
              { name: "garage", label: "Garage", placeholder: "Name and place" },
              { name: "notes", label: "Notes", type: "textarea", wide: true },
            ]}
          />
        </SectionCard>
      </div>
    </>
  );
}

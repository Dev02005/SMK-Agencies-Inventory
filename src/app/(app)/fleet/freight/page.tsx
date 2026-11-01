import type { Metadata } from "next";
import { Suspense } from "react";
import { SimpleForm } from "@/components/forms/simple-form";
import { ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { DataTable } from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import { PageHeader } from "@/components/ui/page-header";
import { RoleGuard } from "@/components/ui/sub-nav";
import { getFreightRates } from "@/lib/data";
import { formatINR } from "@/lib/format";
import { FreightCalculator } from "./freight-calculator";

export const metadata: Metadata = { title: "Freight chart" };

export default function FreightPage() {
  return (
    <>
      <PageHeader
        title="Freight chart"
        subtitle="Fixed delivery rates from Polaki. New FOR bills fill in the transport charge from this chart."
        actions={
          <>
            <SampleChip />
            <ExportMenu title={"Freight chart"} />
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <Rates />
      </Suspense>
    </>
  );
}

async function Rates() {
  const rates = await getFreightRates();
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <DataTable
          rows={rates}
          rowKey={(r) => r.id}
          mobile={(r) => ({ title: r.place, subtitle: `${r.distanceKm} km · min ${formatINR(r.minimum)}`, value: `${formatINR(r.perBag)}/bag`, meta: <span className="text-[12px] text-ink-secondary">{formatINR(r.perMT)}/MT</span> })}
          columns={[
            { key: "place", header: "Place", cell: (r) => r.place },
            { key: "km", header: "Distance", align: "right", cell: (r) => `${r.distanceKm} km` },
            { key: "bag", header: "Cement per bag", align: "right", cell: (r) => formatINR(r.perBag) },
            { key: "mt", header: "Steel per MT", align: "right", cell: (r) => formatINR(r.perMT) },
            { key: "min", header: "Minimum", align: "right", cell: (r) => formatINR(r.minimum) },
          ]}
        />
      </div>
      <div className="space-y-4 lg:col-span-2">
        <FreightCalculator rates={rates} />
        <RoleGuard roles={["owner", "office"]} fallback={null}>
          <SectionCard title="Add or change a rate">
            <SimpleForm
              thing="freight rate"
              submitLabel="Save rate"
              fields={[
                { name: "place", label: "Place", required: true, wide: true },
                { name: "km", label: "Distance (km)", type: "number" },
                { name: "bag", label: "Per bag", type: "number", prefix: "₹", required: true },
                { name: "mt", label: "Per MT of steel", type: "number", prefix: "₹" },
                { name: "min", label: "Minimum charge", type: "number", prefix: "₹" },
              ]}
            />
          </SectionCard>
        </RoleGuard>
      </div>
    </div>
  );
}

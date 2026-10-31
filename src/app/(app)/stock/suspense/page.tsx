import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SimpleForm } from "@/components/forms/simple-form";
import { ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { SampleActionButton } from "@/components/ui/sample-action";
import { getGodowns, getProducts, getSuspenseLoads, getVehicles } from "@/lib/data";
import { formatDate, formatShortDate } from "@/lib/format";
import { lineQty } from "@/lib/quantities";

export const metadata: Metadata = { title: "Suspense loads" };

export default function SuspensePage() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Suspense loads"
        subtitle="Stock sent out before the buyer is known. Assign each load to a party so it gets billed."
        actions={<SampleChip />}
      />
      <Suspense fallback={<ListSkeleton />}>
        <Loads />
      </Suspense>
    </div>
  );
}

async function Loads() {
  const [loads, godowns, products, vehicles] = await Promise.all([getSuspenseLoads(), getGodowns(), getProducts(), getVehicles()]);
  const open = loads.filter((l) => !l.assigned);
  const done = loads.filter((l) => l.assigned);

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        {open.length > 0 && <p className="text-[13px] text-warning">{open.length} load{open.length === 1 ? "" : "s"} still without a buyer</p>}
        {open.map((l) => (
          <SectionCard key={l.id} title={lineQty(l.qty, l.product) + " " + l.product.name} action={<Chip tone="warning">No buyer yet</Chip>}>
            <p className="-mt-2 text-[13px] text-ink-secondary">
              Left {l.godownName} on {formatDate(l.date)} · {l.vehicle}
            </p>
            <p className="mt-2 text-[15px] text-ink">{l.note}</p>
            <SampleActionButton variant="primary" className="mt-4" message="Sample mode: picking the party here would make the bill for this load.">
              Assign to a party
            </SampleActionButton>
          </SectionCard>
        ))}
        {done.length > 0 && (
          <SectionCard title="Assigned">
            <ul className="divide-y divide-hairline">
              {done.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] text-ink">
                      {lineQty(l.qty, l.product)} {l.product.name} → {l.assignedParty}
                    </span>
                    <span className="block text-[12px] text-ink-secondary">
                      Sent {formatShortDate(l.date)} · assigned {formatShortDate(l.assigned!.date)}
                    </span>
                  </span>
                  {l.assigned?.saleId && (
                    <Link href={`/sales/${l.assigned.saleId}`} className="text-[15px] text-link hover:underline">
                      Bill ›
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
      </div>
      <SectionCard title="Send a suspense load" className="lg:col-span-2">
        <SimpleForm
          thing="suspense load"
          submitLabel="Send load"
          fields={[
            { name: "godown", label: "From godown", type: "select", wide: true, options: godowns.map((g) => ({ value: g.id, label: g.name })) },
            { name: "product", label: "Product", type: "select", options: products.map((p) => ({ value: p.id, label: p.name })) },
            { name: "qty", label: "Quantity", type: "number", required: true },
            { name: "vehicle", label: "Vehicle", type: "select", wide: true, options: vehicles.filter((v) => v.kind === "van" || v.kind === "lorry").map((v) => ({ value: v.id, label: v.label })) },
            { name: "note", label: "Where it's going and why", type: "textarea", required: true, wide: true },
          ]}
        />
      </SectionCard>
    </div>
  );
}

import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { SimpleForm } from "@/components/forms/simple-form";
import { BackLink, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getGodowns, getProducts, getVehicles } from "@/lib/data";
import { todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "New transfer" };

export default function NewTransferPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[640px]">
      <PageHeader back={<BackLink href="/stock/transfers">Transfers</BackLink>} title="New transfer" actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton rows={5} />}>
        <TransferForm />
      </Suspense>
    </div>
  );
}

async function TransferForm() {
  await connection();
  const [godowns, products, vehicles] = await Promise.all([getGodowns(), getProducts(), getVehicles()]);
  const places = godowns.map((g) => ({ value: g.id, label: g.name }));
  return (
    <SectionCard>
      <SimpleForm
        thing="transfer"
        submitLabel="Send stock"
        fields={[
          { name: "from", label: "From", type: "select", options: places },
          { name: "to", label: "To", type: "select", options: [...places].reverse() },
          { name: "product", label: "Product", type: "select", options: products.map((p) => ({ value: p.id, label: p.name })) },
          { name: "qty", label: "Quantity (bags or kg)", type: "number", required: true },
          { name: "vehicle", label: "Vehicle", type: "select", options: vehicles.filter((v) => v.kind === "van" || v.kind === "lorry").map((v) => ({ value: v.id, label: v.label })) },
          { name: "date", label: "Date", type: "date", defaultValue: todayISO() },
          { name: "note", label: "Note", type: "textarea", wide: true },
        ]}
      />
    </SectionCard>
  );
}

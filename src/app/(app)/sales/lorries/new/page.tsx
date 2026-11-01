import type { Metadata } from "next";
import { Suspense } from "react";
import { BackLink, ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getParties, getProducts } from "@/lib/data";
import { LorryArrivalForm } from "./lorry-arrival-form";

export const metadata: Metadata = { title: "Lorry arrived" };

/** A company lorry that is sold straight off the truck: note who brought it; its bills are made from New sale. */
export default function LorryArrivedPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[640px]">
      <PageHeader
        back={<BackLink href="/sales/lorries">Lorry sales</BackLink>}
        title="Lorry arrived"
        subtitle="Note a company lorry being sold straight off the truck"
        actions={<SampleChip />}
      />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Form />
      </Suspense>
    </div>
  );
}

async function Form() {
  const [parties, products] = await Promise.all([getParties(), getProducts()]);
  const companies = parties.filter((p) => p.kind === "company").map((p) => ({ id: p.id, name: p.name }));
  return <LorryArrivalForm companies={companies} products={products.filter((p) => p.active)} />;
}

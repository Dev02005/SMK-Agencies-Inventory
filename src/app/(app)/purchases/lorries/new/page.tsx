import type { Metadata } from "next";
import { Suspense } from "react";
import { OwnerOnly } from "@/components/auth/owner-only";
import { BackLink, ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getFirms, getParties, getProducts, getToday } from "@/lib/data";
import { LorryArrivalForm } from "./lorry-arrival-form";

export const metadata: Metadata = { title: "New lorry purchase" };

/** A company lorry bought to sell straight off the truck: firm, company, invoice, lorry and what is on it. Its bills are made from New sale. */
export default function LorryArrivedPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[760px]">
      <PageHeader
        back={<BackLink href="/purchases/lorries">Lorry purchases</BackLink>}
        title="New lorry purchase"
        subtitle="A company lorry bought to sell straight off the truck"
        actions={<SampleChip />}
      />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <OwnerOnly what="lorry purchases">
          <Form />
        </OwnerOnly>
      </Suspense>
    </div>
  );
}

async function Form() {
  const [firms, parties, products, today] = await Promise.all([getFirms(), getParties(), getProducts(), getToday()]);
  return (
    <LorryArrivalForm
      firms={firms.map((f) => ({ id: f.id, name: f.name, gstin: f.gstin }))}
      companies={parties.filter((p) => p.kind === "company").map((p) => ({ id: p.id, name: p.name, brands: p.brands }))}
      products={products.filter((p) => p.active)}
      today={today}
    />
  );
}

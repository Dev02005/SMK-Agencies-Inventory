import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BackLink, ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getGodowns, getParties, getProducts } from "@/lib/data";
import { todayISO } from "@/lib/format";
import { PurchaseForm } from "./purchase-form";

export const metadata: Metadata = { title: "New purchase" };

export default function NewPurchasePage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[760px]">
      <PageHeader back={<BackLink href="/purchases">Purchases</BackLink>} title="New purchase" actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <FormForToday />
      </Suspense>
    </div>
  );
}

async function FormForToday() {
  await connection();
  const [parties, products, godowns] = await Promise.all([getParties(), getProducts(), getGodowns()]);
  return (
    <PurchaseForm
      companies={parties.filter((p) => p.kind === "company").map((p) => ({ id: p.id, name: p.name }))}
      products={products.filter((p) => p.active)}
      godowns={godowns}
      today={todayISO()}
    />
  );
}

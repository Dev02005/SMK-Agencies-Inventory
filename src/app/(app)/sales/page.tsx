import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getProducts, getSales } from "@/lib/data";
import { SalesList } from "./sales-list";

export const metadata: Metadata = { title: "Godown sales" };

export default function SalesPage() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Godown sales"
        subtitle="Bills for bags from our godowns, newest first. Bills from company lorries are under Lorry sales."
        actions={
          <>
            <SampleChip />
            <ButtonLink href="/sales/new">New sale</ButtonLink>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <SalesData />
      </Suspense>
    </div>
  );
}

async function SalesData() {
  const [all, products] = await Promise.all([getSales(), getProducts()]);
  const sales = all.filter((s) => s.source !== "lorry");
  return <SalesList sales={sales} products={products} />;
}

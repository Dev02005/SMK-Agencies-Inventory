import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getProducts, getSales, getToday } from "@/lib/data";
import { SalesList } from "./sales-list";

export const metadata: Metadata = { title: "Sales" };

export default function SalesPage() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Sales"
        subtitle="Every bill, newest first"
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
  const [sales, products] = await Promise.all([getSales(), getProducts()]);
  return <SalesList sales={sales} products={products} today={getToday()} />;
}

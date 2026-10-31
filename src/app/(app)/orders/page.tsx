import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getOrders, getProducts, getToday } from "@/lib/data";
import { OrdersBoard } from "./orders-board";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Orders"
        subtitle="What parties have asked for, and what is still to be sent"
        actions={
          <>
            <SampleChip />
            <ButtonLink href="/orders/new">New order</ButtonLink>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <OrdersData />
      </Suspense>
    </div>
  );
}

async function OrdersData() {
  const [orders, products] = await Promise.all([getOrders(), getProducts()]);
  return <OrdersBoard orders={orders} products={products} today={getToday()} />;
}

import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BackLink, ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getMyGodowns, getParties, getProducts } from "@/lib/data";
import { todayISO } from "@/lib/format";
import { OrderForm } from "./order-form";

export const metadata: Metadata = { title: "New order" };

export default function NewOrderPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[760px]">
      <PageHeader back={<BackLink href="/orders">Orders</BackLink>} title="New order" subtitle="No rates yet: the bill is made when the order is sent" actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <FormForToday />
      </Suspense>
    </div>
  );
}

async function FormForToday() {
  await connection();
  const [parties, products, godowns] = await Promise.all([getParties(), getProducts(), getMyGodowns()]);
  return (
    <OrderForm
      parties={parties.filter((p) => p.kind === "customer" || p.kind === "sub_dealer").map((p) => ({ id: p.id, name: p.name, place: p.place, kind: p.kind }))}
      products={products.filter((p) => p.active)}
      godowns={godowns.map((g) => ({ id: g.id, name: g.name, own: g.own, productIds: g.productIds, linkAllProducts: g.linkAllProducts }))}
      today={todayISO()}
    />
  );
}

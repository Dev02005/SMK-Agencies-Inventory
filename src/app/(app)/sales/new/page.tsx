import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BackLink, ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser, getGodowns, getParties, getProducts } from "@/lib/data";
import { todayISO } from "@/lib/format";
import { NewSaleForm } from "./new-sale-form";

export const metadata: Metadata = { title: "New sale" };

export default function NewSalePage() {
  return (
    <div className="animate-fade-up">
      <PageHeader back={<BackLink href="/sales">Sales</BackLink>} title="New sale" actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <FormForToday />
      </Suspense>
    </div>
  );
}

/** Rendered per request so the bill date defaults to today and balances are current. */
async function FormForToday() {
  await connection();
  const [parties, products, godowns, user] = await Promise.all([getParties(), getProducts(), getGodowns(), getCurrentUser()]);
  const buyers = parties
    .filter((p) => p.kind === "cash" || p.kind === "customer" || p.kind === "sub_dealer")
    .map((p) => ({ id: p.id, name: p.name, place: p.place, creditLimit: p.creditLimit, outstanding: Math.max(p.balance, 0) }));
  return (
    <NewSaleForm
      products={products.filter((p) => p.active)}
      parties={buyers}
      godowns={godowns}
      role={user.role}
      today={todayISO()}
    />
  );
}

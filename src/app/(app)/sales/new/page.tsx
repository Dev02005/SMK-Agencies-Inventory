import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BackLink, ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser, getFirm, getFirms, getLorryLoads, getMyGodowns, getParties, getProducts, getVehicles } from "@/lib/data";
import { todayISO } from "@/lib/format";
import { NewSaleForm } from "./new-sale-form";

export const metadata: Metadata = { title: "New sale" };

export default function NewSalePage({ searchParams }: PageProps<"/sales/new">) {
  return (
    <div className="animate-fade-up">
      <PageHeader back={<BackLink href="/sales">Sales</BackLink>} title="New sale" actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <FormForToday searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/** Rendered per request so the bill date defaults to today and balances are current. */
async function FormForToday({ searchParams }: { searchParams: PageProps<"/sales/new">["searchParams"] }) {
  await connection();
  const [firm, firms, parties, products, godowns, vehicles, loads, sp] = await Promise.all([
    getFirm(),
    getFirms(),
    getParties(),
    getProducts(),
    getMyGodowns(),
    getVehicles(),
    getLorryLoads(),
    searchParams,
  ]);
  const buyers = parties
    .filter((p) => p.kind === "cash" || p.kind === "customer" || p.kind === "sub_dealer")
    .map((p) => ({ id: p.id, name: p.name, place: p.place, kind: p.kind, creditLimit: p.creditLimit, outstanding: Math.max(p.balance, 0), mobile: p.mobile }));
  // Delivery vehicles only: our lorries and vans for FOR, and rented ones (with their owner) for RENT.
  const delivery = vehicles.filter((v) => v.kind === "lorry" || v.kind === "van");
  const ownVehicles = delivery
    .filter((v) => v.category !== "rented")
    .map((v) => ({ id: v.id, label: v.label, hint: [v.model, v.driverName].filter(Boolean).join(" · ") }));
  const rentedVehicles = delivery.filter((v) => v.category === "rented").map((v) => ({ id: v.id, label: v.label, hint: v.ownerName ?? v.model }));
  // Company lorries still selling; "Sell from this lorry" on Sales › Lorry sales opens with that lorry chosen.
  // Selling from company lorries is the owner's alone.
  const isOwner = (await getCurrentUser()).role === "owner";
  const lorries = loads
    .filter((l) => isOwner && l.status === "selling")
    .map((l) => ({
      id: l.id,
      lorryNo: l.lorryNo,
      companyName: l.companyName,
      driverName: l.driverName,
      invoiceNo: l.invoiceNo,
      invoicePaperKept: l.invoicePaperKept,
      unloadingCharges: l.unloadingCharges,
    }));
  return (
    <NewSaleForm
      firms={firms.map((f) => ({ id: f.id, name: f.name, gstin: f.gstin }))}
      primaryFirmId={firm.id}
      products={products.filter((p) => p.active)}
      parties={buyers}
      godowns={godowns}
      ownVehicles={ownVehicles}
      rentedVehicles={rentedVehicles}
      lorries={lorries}
      preselect={typeof sp.lorry === "string" ? sp.lorry : undefined}
      today={todayISO()}
    />
  );
}

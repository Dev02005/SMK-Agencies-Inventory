import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BackLink, ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getDestinations, getFirm, getFirms, getMyGodowns, getNextBillNo, getParties, getProducts, getProfiles, getRentDrivers, getVehicles } from "@/lib/data";
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
  const [firm, firms, parties, products, godowns, vehicles, nextBillNo, destinations, profiles, rentDrivers] = await Promise.all([
    getFirm(),
    getFirms(),
    getParties(),
    getProducts(),
    getMyGodowns(),
    getVehicles(),
    getNextBillNo(),
    getDestinations(),
    getProfiles(),
    getRentDrivers(),
  ]);
  const buyers = parties
    .filter((p) => p.kind === "cash" || p.kind === "customer" || p.kind === "sub_dealer")
    .map((p) => ({ id: p.id, name: p.name, place: p.place, kind: p.kind, creditLimit: p.creditLimit, outstanding: Math.max(p.balance, 0), mobile: p.mobile }));
  // Delivery vehicles only: our lorries and vans for FOR, and rented ones (with their owner) for RENT.
  const delivery = vehicles.filter((v) => v.kind === "lorry" || v.kind === "van");
  const ownVehicles = delivery
    .filter((v) => v.category !== "rented")
    .map((v) => ({ id: v.id, label: v.label, hint: [v.model, v.driverName].filter(Boolean).join(" · "), driverId: v.driverId }));
  // Our own drivers, for FOR deliveries.
  const ownDrivers = profiles.filter((p) => p.role === "driver" && p.active).map((p) => ({ id: p.id, name: p.fullName }));
  const rentedVehicles = delivery.filter((v) => v.category === "rented").map((v) => ({ id: v.id, label: v.label, hint: v.ownerName ?? v.model }));
  return (
    <NewSaleForm
      firms={firms.map((f) => ({ id: f.id, name: f.name, gstin: f.gstin }))}
      primaryFirmId={firm.id}
      products={products.filter((p) => p.active)}
      parties={buyers}
      godowns={godowns}
      ownVehicles={ownVehicles}
      rentedVehicles={rentedVehicles}
      nextBillNo={nextBillNo}
      destinations={destinations}
      ownDrivers={ownDrivers}
      rentDrivers={rentDrivers}
      today={todayISO()}
    />
  );
}

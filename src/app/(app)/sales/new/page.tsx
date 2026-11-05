import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BackLink, ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getDestinations, getFirm, getFirms, getMyGodowns, getNextBillNo, getParties, getProducts, getProfiles, getStockBalances, getVehicles } from "@/lib/data";
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
  const [firm, firms, parties, products, godowns, vehicles, nextBillNo, destinations, profiles, balances] = await Promise.all([
    getFirm(),
    getFirms(),
    getParties(),
    getProducts(),
    getMyGodowns(),
    getVehicles(),
    getNextBillNo(),
    getDestinations(),
    getProfiles(),
    // Only the godowns this person may see (getStockBalances), so everyone sees the same stock for a godown.
    getStockBalances(),
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
  // Rented vehicles, each with its own driver. Once the firm's own rented vehicles are entered, the sample one goes.
  const rented = delivery.filter((v) => v.category === "rented");
  const rentedVehicles = (rented.some((v) => v.original) ? rented.filter((v) => v.original) : rented).map((v) => ({
    id: v.id,
    label: v.label,
    hint: [v.model, v.rentDriver?.name ?? v.ownerName].filter(Boolean).join(" · "),
    driver: v.rentDriver,
  }));
  return (
    <NewSaleForm
      firms={firms.map((f) => ({ id: f.id, name: f.name, gstin: f.gstin }))}
      primaryFirmId={firm.id}
      products={products.filter((p) => p.active)}
      parties={buyers}
      godowns={godowns}
      stock={balances.filter((b) => b.qty > 0).map((b) => ({ godownId: b.godownId, productId: b.productId, qty: b.qty }))}
      ownVehicles={ownVehicles}
      rentedVehicles={rentedVehicles}
      nextBillNo={nextBillNo}
      destinations={destinations}
      ownDrivers={ownDrivers}
      today={todayISO()}
    />
  );
}

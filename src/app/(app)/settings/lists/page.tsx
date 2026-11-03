import type { Metadata } from "next";
import { Suspense } from "react";
import { BackLink, ListSkeleton } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getDestinations, getRentDrivers } from "@/lib/data";
import { createDestination, createRentDriver } from "../../sales/new/actions";
import { removeDestination, removeRentDriver } from "./actions";
import { SavedList } from "./saved-list";

export const metadata: Metadata = { title: "Destinations & rent drivers" };

/** The two lists New sale offers (where a bill is delivered, and who drives a rented vehicle), to add to or delete from. */
export default function ListsPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[760px] space-y-4">
      <PageHeader back={<BackLink href="/settings">Settings</BackLink>} title="Destinations & rent drivers" subtitle="The lists offered on New sale" />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Lists />
      </Suspense>
    </div>
  );
}

async function Lists() {
  const [destinations, drivers] = await Promise.all([getDestinations(), getRentDrivers()]);
  return (
    <>
      <SavedList title="Destinations" items={destinations} noun="destination" placeholder="Village or town" onAdd={createDestination} onDelete={removeDestination} />
      <SavedList title="Rent drivers" items={drivers} noun="driver" placeholder="Driver's name" onAdd={createRentDriver} onDelete={removeRentDriver} />
    </>
  );
}

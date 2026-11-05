import type { Metadata } from "next";
import { Suspense } from "react";
import { BackLink, ListSkeleton } from "@/components/ui/blocks";
import { DataOrigin } from "@/components/ui/data-origin";
import { ExportMenu } from "@/components/ui/export-menu";
import { PageHeader } from "@/components/ui/page-header";
import { getDesignations, getMyGodowns, getProducts, getProfiles, getStockBalances } from "@/lib/data";
import { GodownManager } from "./godown-manager";

export const metadata: Metadata = { title: "Godowns" };

export default function GodownSettingsPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[760px] space-y-4">
      <PageHeader
        back={<BackLink href="/settings">Settings</BackLink>}
        title="Godowns"
        subtitle="Our godowns and the cement companies' godowns where our stock is kept, with multiple in-charges and linked products"
        actions={
          <>
            <DataOrigin of="godowns" />
            <ExportMenu title={"Godowns"} />
          </>
        }
      />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <GodownSettingsContent />
      </Suspense>
    </div>
  );
}

async function GodownSettingsContent() {
  const [godowns, products, profiles, designations, balances] = await Promise.all([
    getMyGodowns(),
    getProducts(),
    getProfiles(),
    getDesignations(),
    getStockBalances(),
  ]);

  return (
    <GodownManager
      initialGodowns={godowns}
      products={products}
      profiles={profiles}
      designations={designations}
      balances={balances}
    />
  );
}

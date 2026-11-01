import type { Metadata } from "next";
import { Suspense } from "react";
import { SimpleForm } from "@/components/forms/simple-form";
import { BackLink, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { DataTable } from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import { PageHeader } from "@/components/ui/page-header";
import { getGodowns, getStockBalances } from "@/lib/data";

export const metadata: Metadata = { title: "Godowns" };

export default function GodownSettingsPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[760px] space-y-4">
      <PageHeader back={<BackLink href="/settings">Settings</BackLink>} title="Godowns" actions={
          <>
            <SampleChip />
            <ExportMenu title={"Godowns"} />
          </>
        } />
      <Suspense fallback={<ListSkeleton rows={2} />}>
        <GodownList />
      </Suspense>
      <SectionCard title="Add a godown">
        <SimpleForm
          thing="godown"
          submitLabel="Add godown"
          fields={[
            { name: "name", label: "Godown name", required: true },
            { name: "place", label: "Place", required: true },
          ]}
        />
      </SectionCard>
    </div>
  );
}

/** Stock is counted as of today, so the list streams in at request time. */
async function GodownList() {
  const [godowns, balances] = await Promise.all([getGodowns(), getStockBalances()]);
  const products = (id: string) => balances.filter((b) => b.godownId === id && b.qty > 0).length;
  return (
    <DataTable
      rows={godowns}
      rowKey={(g) => g.id}
      mobile={(g) => ({ title: g.name, subtitle: g.place, value: `${products(g.id)} products` })}
      columns={[
        { key: "name", header: "Godown", cell: (g) => g.name },
        { key: "place", header: "Place", cell: (g) => g.place, className: "text-ink-secondary" },
        { key: "products", header: "Products in stock", align: "right", cell: (g) => products(g.id) },
      ]}
    />
  );
}

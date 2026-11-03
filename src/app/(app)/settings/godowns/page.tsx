import type { Metadata } from "next";
import { Suspense } from "react";
import { SimpleForm } from "@/components/forms/simple-form";
import { BackLink, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import { PageHeader } from "@/components/ui/page-header";
import { getDesignations, getMyGodowns, getProfiles, getStockBalances } from "@/lib/data";

export const metadata: Metadata = { title: "Godowns" };

export default function GodownSettingsPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[760px] space-y-4">
      <PageHeader
        back={<BackLink href="/settings">Settings</BackLink>}
        title="Godowns"
        subtitle="Our godowns and the cement companies' godowns where our stock is kept, with who looks after each"
        actions={
          <>
            <SampleChip />
            <ExportMenu title={"Godowns"} />
          </>
        } />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <GodownList />
      </Suspense>
      <Suspense>
        <AddGodown />
      </Suspense>
    </div>
  );
}

/** Stock is counted as of today, so the list streams in at request time. */
async function GodownList() {
  const [godowns, balances, profiles, designations] = await Promise.all([getMyGodowns(), getStockBalances(), getProfiles(), getDesignations()]);
  const products = (id: string) => balances.filter((b) => b.godownId === id && b.qty > 0).length;
  const inCharge = (ids: string[] = []) =>
    ids
      .map((id) => profiles.find((p) => p.id === id))
      .filter((p) => p !== undefined)
      .map((p) => `${p.fullName}${designations[p.id] ? ` (${designations[p.id]})` : ""}`)
      .join(", ") || "Not assigned";
  return (
    <DataTable
      rows={godowns}
      rowKey={(g) => g.id}
      mobile={(g) => ({
        title: g.name,
        subtitle: `In-charge: ${inCharge(g.inCharge)}`,
        value: `${products(g.id)} products`,
        meta: g.own && <Chip tone="accent">Own</Chip>,
      })}
      columns={[
        { key: "name", header: "Godown", cell: (g) => g.name },
        { key: "kind", header: "", srHeader: "Own or company", cell: (g) => (g.own ? <Chip tone="accent">Own</Chip> : <Chip>Company</Chip>) },
        { key: "incharge", header: "In-charge", cell: (g) => inCharge(g.inCharge), className: "text-ink-secondary" },
        { key: "products", header: "Products in stock", align: "right", cell: (g) => products(g.id) },
      ]}
    />
  );
}

async function AddGodown() {
  const profiles = await getProfiles();
  return (
    <SectionCard title="Add a godown">
      <SimpleForm
        thing="godown"
        submitLabel="Add godown"
        fields={[
          { name: "name", label: "Godown name", required: true, placeholder: "e.g. UltraTech Cements godown" },
          { name: "place", label: "Place", required: true },
          {
            name: "kind",
            label: "Whose godown",
            type: "select",
            options: [
              { value: "company", label: "A cement company's godown" },
              { value: "own", label: "Our own godown" },
            ],
          },
          {
            name: "incharge",
            label: "In-charge",
            type: "select",
            options: profiles.filter((p) => p.role !== "owner").map((p) => ({ value: p.id, label: p.fullName })),
          },
        ]}
      />
    </SectionCard>
  );
}

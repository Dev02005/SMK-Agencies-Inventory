import type { Metadata } from "next";
import { SimpleForm } from "@/components/forms/simple-form";
import { BackLink, SampleChip, SectionCard } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import { PageHeader } from "@/components/ui/page-header";
import { getProducts } from "@/lib/data";
import { formatINR } from "@/lib/format";

export const metadata: Metadata = { title: "Products & rates" };

export default async function ProductSettingsPage() {
  const products = await getProducts();
  return (
    <div className="animate-fade-up mx-auto max-w-[760px] space-y-4">
      <PageHeader
        back={<BackLink href="/settings">Settings</BackLink>}
        title="Products & rates"
        subtitle="List rates fill in new bills; changing a rate on a bill needs a reason"
        actions={
          <>
            <SampleChip />
            <ExportMenu title={"Products and rates"} />
          </>
        }
      />
      <DataTable
        rows={products}
        rowKey={(p) => p.id}
        mobile={(p) => ({
          title: p.name,
          subtitle: `${p.brand} · ${p.category === "cement" ? "Cement, per bag" : "Steel, per kg"}`,
          value: formatINR(p.listRate),
          meta: !p.active && <Chip>Inactive</Chip>,
        })}
        columns={[
          { key: "name", header: "Product", cell: (p) => p.name },
          { key: "brand", header: "Brand", cell: (p) => p.brand, className: "text-ink-secondary" },
          { key: "category", header: "Type", cell: (p) => (p.category === "cement" ? "Cement" : "Steel"), className: "text-ink-secondary" },
          { key: "unit", header: "Unit", cell: (p) => (p.unit === "bag" ? "Bag (20 = 1 MT)" : "Kg (1000 = 1 MT)"), className: "text-ink-secondary" },
          { key: "rate", header: "List rate", align: "right", cell: (p) => formatINR(p.listRate) },
        ]}
      />
      <SectionCard title="Add a product">
        <SimpleForm
          thing="product"
          submitLabel="Add product"
          fields={[
            { name: "name", label: "Product name", required: true, placeholder: "e.g. Deccan OPC 53" },
            { name: "brand", label: "Brand", required: true },
            {
              name: "category",
              label: "Type",
              type: "select",
              options: [
                { value: "cement", label: "Cement (sold in bags)" },
                { value: "steel", label: "Steel (sold by kg)" },
              ],
            },
            { name: "rate", label: "List rate", type: "number", prefix: "₹", required: true },
          ]}
        />
      </SectionCard>
    </div>
  );
}

import type { Metadata } from "next";
import { BackLink, SectionCard } from "@/components/ui/blocks";
import { ExportMenu } from "@/components/ui/export-menu";
import { ExportTable } from "@/components/ui/export-table";
import { PageHeader } from "@/components/ui/page-header";
import { getProducts } from "@/lib/data";
import { formatINR } from "@/lib/format";
import { AddProduct, ProductRates } from "./product-rates";

export const metadata: Metadata = { title: "Products & rates" };

/** Every product by brand with its list rate (saved straight away), and adding a product. */
export default async function ProductSettingsPage() {
  const products = await getProducts();
  return (
    <div className="animate-fade-up mx-auto max-w-[760px] space-y-4">
      <PageHeader
        back={<BackLink href="/settings">Settings</BackLink>}
        title="Products & rates"
        subtitle="List rates fill in new bills; changing a rate on a bill needs a reason"
        actions={<ExportMenu title="Products and rates" />}
      />
      <ExportTable
        columns={["Brand", "Type", "Sold by", "List rate"]}
        rows={products.map((p) => [p.brand, p.variant ?? p.name, p.unit === "bag" ? "Bag" : "Kg", p.listRate ? formatINR(p.listRate) : ""])}
      />
      <ProductRates products={products} />
      <SectionCard title="Add a product">
        <AddProduct brands={[...new Set(products.map((p) => p.brand))]} />
      </SectionCard>
    </div>
  );
}

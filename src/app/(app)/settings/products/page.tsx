import type { Metadata } from "next";
import { BackLink, OriginChip, SectionCard } from "@/components/ui/blocks";
import { ExportMenu } from "@/components/ui/export-menu";
import { ExportTable } from "@/components/ui/export-table";
import { PageHeader } from "@/components/ui/page-header";
import { getProducts } from "@/lib/data";
import { AddProduct, ProductList } from "./product-list";

export const metadata: Metadata = { title: "Products" };

/** Every product by brand, and adding a product. Products have no rates: the owner prices each bill when approving it. */
export default async function ProductSettingsPage() {
  const products = await getProducts();
  return (
    <div className="animate-fade-up mx-auto max-w-[760px] space-y-4">
      <PageHeader
        back={<BackLink href="/settings">Settings</BackLink>}
        title="Products"
        subtitle="What we sell. There are no fixed rates: the owner puts the price on each bill."
        actions={
          <>
            <OriginChip records={products} />
            <ExportMenu title="Products" />
          </>
        }
      />
      <ExportTable
        columns={["Brand", "Type", "Sold by"]}
        rows={products.map((p) => [p.brand, p.variant ?? p.name, p.unit === "bag" ? "Bag" : "Kg"])}
      />
      <ProductList products={products} />
      <SectionCard title="Add a product">
        <AddProduct brands={[...new Set(products.map((p) => p.brand))]} />
      </SectionCard>
    </div>
  );
}

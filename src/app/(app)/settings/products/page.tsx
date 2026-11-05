import type { Metadata } from "next";
import { Suspense } from "react";
import { BackLink, ListSkeleton, OriginChip } from "@/components/ui/blocks";
import { ExportMenu } from "@/components/ui/export-menu";
import { ExportTable } from "@/components/ui/export-table";
import { PageHeader } from "@/components/ui/page-header";
import { getProducts } from "@/lib/data";
import { unitLabel } from "@/lib/sales";
import { ProductList } from "./product-list";

export const metadata: Metadata = { title: "Products" };

/** Every product by brand, and adding a product. Products have no rates: the owner prices each bill when approving it. */
export default function ProductSettingsPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[760px] space-y-4">
      <Suspense fallback={<ListSkeleton rows={5} />}>
        <Products />
      </Suspense>
    </div>
  );
}

// The list is read at request time (a product can be added on another server), so it streams in.
async function Products() {
  const products = await getProducts();
  return (
    <>
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
        columns={["Brand", "Type", "Category", "Sold by"]}
        rows={products.map((p) => [
          p.brand,
          p.variant ?? p.name,
          p.category,
          p.unit === "bag" ? "Bag" : p.unit === "kg" ? "Kg" : (unitLabel[p.unit] || p.unit),
        ])}
      />
      <ProductList products={products} />
    </>
  );
}

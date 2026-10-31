import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BackLink, ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getGodowns, getProducts, getPurchases } from "@/lib/data";
import { todayISO } from "@/lib/format";
import { InwardForm } from "./inward-form";

export const metadata: Metadata = { title: "Stock inward" };

export default function StockInwardPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[760px]">
      <PageHeader back={<BackLink href="/stock">Stock</BackLink>} title="Stock inward" subtitle="Unload a lorry into a godown" actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <FormForToday />
      </Suspense>
    </div>
  );
}

async function FormForToday() {
  await connection();
  const [purchases, products, godowns] = await Promise.all([getPurchases(), getProducts(), getGodowns()]);
  return (
    <InwardForm
      purchases={purchases.slice(0, 6).map((p) => ({
        id: p.id,
        label: `#${p.purchaseNo} · ${p.companyName} · ${p.invoiceNo}`,
        lorryNo: p.lorryNo,
        godownId: p.godownId,
        lines: p.lines,
      }))}
      products={products.filter((p) => p.active)}
      godowns={godowns}
      today={todayISO()}
    />
  );
}

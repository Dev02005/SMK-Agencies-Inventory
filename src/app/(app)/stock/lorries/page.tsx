import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OwnerOnly } from "@/components/auth/owner-only";
import { LorryMeta, LorryStateChip, LorryTitle } from "@/components/lorries/lorry-bits";
import { LorryProgress } from "@/components/lorries/lorry-progress";
import { ListSkeleton, SectionCard } from "@/components/ui/blocks";
import { DataOrigin } from "@/components/ui/data-origin";
import { PageHeader } from "@/components/ui/page-header";
import { getLorries, getProducts } from "@/lib/data";
import { soldBills } from "@/lib/lorries";

export const metadata: Metadata = { title: "Lorry stock" };

/** What is on company lorries still selling off the truck. Once a lorry's sale is updated it leaves this list. */
export default function LorryStockPage() {
  return (
    <div className="animate-fade-up">
      <PageHeader title="Lorry stock" subtitle="What is on company lorries still selling straight off the truck" actions={<DataOrigin of="lorries" />} />
      <Suspense fallback={<ListSkeleton />}>
        <OwnerOnly what="lorry stock">
          <Lorries />
        </OwnerOnly>
      </Suspense>
    </div>
  );
}

async function Lorries() {
  const [lorries, products] = await Promise.all([getLorries(), getProducts()]);
  const selling = lorries.filter((l) => !l.sold);
  if (selling.length === 0) return <SectionCard>No lorry is selling right now.</SectionCard>;
  return (
    <div className="space-y-4">
      {selling.map((l) => (
        <SectionCard key={l.id} title={<LorryTitle lorry={l} />} action={<LorryStateChip lorry={l} />}>
          <LorryMeta lorry={l} />
          <div className="mt-4">
            <LorryProgress loaded={l.lines} sold={(pid) => l.sale?.lines.find((x) => x.productId === pid)?.qty ?? 0} products={products} bills={soldBills(l)} />
          </div>
          <p className="mt-2 text-[13px]">
            <Link href={`/sales/lorries/${l.id}`} className="text-link hover:underline">
              Update the sale ›
            </Link>
          </p>
        </SectionCard>
      ))}
    </div>
  );
}

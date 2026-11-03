import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OwnerOnly } from "@/components/auth/owner-only";
import { LorryDue, LorryItems, LorryMeta, LorryStateChip, LorryTitle } from "@/components/lorries/lorry-bits";
import { ListSkeleton, SectionCard } from "@/components/ui/blocks";
import { DataOrigin } from "@/components/ui/data-origin";
import { PageHeader } from "@/components/ui/page-header";
import { getLorries, getProducts, getToday } from "@/lib/data";
import { lorryLeft } from "@/lib/lorries";
import { describeQuantities } from "@/lib/quantities";

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
  const [lorries, products, today] = await Promise.all([getLorries(), getProducts(), getToday()]);
  const selling = lorries.filter((l) => !l.sold);
  if (selling.length === 0) return <SectionCard>No lorry is selling right now.</SectionCard>;
  return (
    <div className="space-y-4">
      {selling.map((l) => (
        <SectionCard key={l.id} title={<LorryTitle lorry={l} />} action={<LorryStateChip lorry={l} today={today} />}>
          <LorryMeta lorry={l} />
          <LorryItems lorry={l} products={products} />
          {l.sale && <p className="mt-2 text-[15px] font-medium text-ink">Left on it: {describeQuantities(lorryLeft(l).filter((x) => x.qty > 0), products) || "nothing"}</p>}
          <LorryDue lorry={l} today={today} />
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

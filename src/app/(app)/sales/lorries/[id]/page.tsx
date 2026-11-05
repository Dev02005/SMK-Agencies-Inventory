import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OwnerPage } from "@/components/auth/owner-only";
import { LorryCost, LorryItems, LorryMeta, LorryStateChip, LorryTitle } from "@/components/lorries/lorry-bits";
import { BackLink, ListSkeleton, SectionCard } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getFirms, getLorries, getNextBillNo, getProducts, getToday } from "@/lib/data";
import { isSavedLorry } from "@/lib/lorries";
import { LorrySaleForm } from "./lorry-sale-form";

export const metadata: Metadata = { title: "Update lorry sale" };

/** One company lorry: what came on it, then its sale updated like a godown sale. The owner's alone. */
export default function LorrySalePage({ params }: PageProps<"/sales/lorries/[id]">) {
  return (
    <div className="animate-fade-up mx-auto max-w-[760px]">
      <BackLink href="/sales/lorries">Lorry sales</BackLink>
      <OwnerPage what="lorry sales">
        <Suspense fallback={<ListSkeleton rows={6} />}>
          <Lorry params={params} />
        </Suspense>
      </OwnerPage>
    </div>
  );
}

async function Lorry({ params }: { params: PageProps<"/sales/lorries/[id]">["params"] }) {
  const { id } = await params;
  const [lorries, products, firms, today, nextBillNo] = await Promise.all([getLorries(), getProducts(), getFirms(), getToday(), getNextBillNo()]);
  const lorry = lorries.find((l) => l.id === id);
  if (!lorry) notFound();
  return (
    <>
      <PageHeader title={<LorryTitle lorry={lorry} />} subtitle="Update what is sold from this lorry" actions={<LorryStateChip lorry={lorry} />} />
      <div className="space-y-4">
        <SectionCard title="The lorry">
          <LorryMeta lorry={lorry} firmName={firms.find((f) => f.id === lorry.firmId)?.name} />
          <LorryItems lorry={lorry} products={products} />
          <LorryCost lorry={lorry} />
        </SectionCard>
        {isSavedLorry(lorry) ? (
          <LorrySaleForm lorry={lorry} products={products} today={today} nextBillNo={nextBillNo} />
        ) : (
          <SectionCard>Sample lorry: only lorries you enter can be updated.</SectionCard>
        )}
      </div>
    </>
  );
}

import { Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { getLorryLoads, getProducts } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { DeviceLorryStock } from "./device-lorry-stock";
import { LoadLines } from "./load-lines";

export const metadata: Metadata = { title: "Lorry stock" };

/** Bags still on company lorries that are being sold off the truck. The lorries themselves and their bills are under Sales › Lorry sales. */
export default function LorryStockPage() {
  return (
    <div className="animate-fade-up">
      <PageHeader title="Lorry stock" subtitle="Bags still on company lorries being sold straight off the truck" actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton />}>
        <Loads />
      </Suspense>
    </div>
  );
}

async function Loads() {
  const [loads, products] = await Promise.all([getLorryLoads(), getProducts()]);
  const selling = loads.filter((l) => l.status === "selling");
  return (
    <div className="space-y-4">
      <DeviceLorryStock products={products} serverCount={selling.length} />
      {selling.map((load) => (
        <SectionCard
          key={load.id}
          title={
            <span className="flex items-center gap-2">
              <Truck size={20} strokeWidth={1.75} className="text-warning" aria-hidden />
              {load.lorryNo}
            </span>
          }
          action={<Chip tone="warning">Selling</Chip>}
        >
          <p className="-mt-2 text-[13px] text-ink-secondary">
            {load.companyName} · arrived {formatDate(load.arrivedOn)} ·{" "}
            <Link href={`/purchases/${load.purchaseId}`} className="text-link underline underline-offset-2">
              purchase
            </Link>
          </p>
          <LoadLines lines={load.lines} products={products} />
        </SectionCard>
      ))}
    </div>
  );
}

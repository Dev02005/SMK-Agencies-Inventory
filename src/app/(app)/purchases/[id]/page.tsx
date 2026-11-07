import { Package, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink, DetailList, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getFirms, getGodowns, getProducts, getPurchase } from "@/lib/data";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { lineQty } from "@/lib/quantities";
import { toMT } from "@/lib/sales";
import { DeletePurchaseButton } from "./delete-purchase-button";

export const metadata: Metadata = { title: "Purchase receipt" };

export default function PurchasePage({ params }: PageProps<"/purchases/[id]">) {
  return (
    <div className="animate-fade-up">
      <BackLink href="/purchases">Purchases</BackLink>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <PurchaseDetail params={params} />
      </Suspense>
    </div>
  );
}

async function PurchaseDetail({ params }: { params: PageProps<"/purchases/[id]">["params"] }) {
  const { id } = await params;
  const purchase = await getPurchase(id);
  if (!purchase) notFound();
  const [products, godowns, firms] = await Promise.all([getProducts(), getGodowns(), getFirms()]);
  const firm = firms.find((f) => f.id === purchase.firmId) ?? firms.find((f) => f.primary);

  return (
    <>
      <PageHeader
        title={`Purchase Receipt #${purchase.purchaseNo}`}
        subtitle={
          <>
            {formatDate(purchase.invoiceDate)} ·{" "}
            <Link href={`/parties/${purchase.companyId}`} className="text-link hover:underline">
              {purchase.companyName}
            </Link>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <SampleChip />
            <DeletePurchaseButton
              purchaseId={purchase.id}
              what={`Purchase Receipt #${purchase.purchaseNo}`}
              compact
            />
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Items" icon={Package} iconTone="accent" className="lg:col-span-2">
          <ul className="divide-y divide-hairline">
            {purchase.lines.map((l, i) => {
              const p = products.find((x) => x.id === l.productId);
              return (
                <li key={i} className="flex justify-between gap-4 py-3">
                  <p className="text-[15px] font-medium text-ink">{p?.name}</p>
                  <p className="text-right text-[15px] tabular-nums text-ink">
                    {lineQty(l.qty, p)}
                    {p && <span className="block text-[13px] text-ink-secondary">{formatNumber(toMT(l.qty, p.unit), 3)} MT</span>}
                  </p>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 flex items-baseline justify-between border-t border-hairline pt-3">
            <span className="text-[15px] text-ink-secondary">Total invoice value</span>
            <span className="text-[28px] font-semibold tabular-nums tracking-[-0.4px] text-ink">{formatINR(purchase.total)}</span>
          </div>
        </SectionCard>
        <SectionCard title="Invoice and truck" icon={Truck} iconTone="teal">
          <DetailList
            items={[
              { label: "Purchase receipt no.", value: `#${purchase.purchaseNo}` },
              { label: "Company invoice no.", value: purchase.invoiceNo },
              { label: "For firm", value: firm?.name },
              { label: "Company invoice date", value: formatDate(purchase.invoiceDate) },
              { label: "Truck received", value: formatDate(purchase.receivedDate) },
              { label: "Truck number", value: purchase.lorryNo },
              { label: "Driver number", value: purchase.driverMobile && `+91 ${purchase.driverMobile}` },
              { label: "Unloaded at", value: godowns.find((g) => g.id === purchase.godownId)?.name },
            ]}
          />
          <div className="mt-4 pt-3 border-t border-hairline/60">
            <DeletePurchaseButton
              purchaseId={purchase.id}
              what={`Purchase Receipt #${purchase.purchaseNo}`}
            />
          </div>
        </SectionCard>
      </div>
    </>
  );
}

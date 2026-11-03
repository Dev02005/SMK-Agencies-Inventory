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

export const metadata: Metadata = { title: "Purchase" };

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
  const itemsTotal = purchase.lines.reduce((s, l) => s + l.qty * l.rate, 0);

  return (
    <>
      <PageHeader
        title={`Purchase #${purchase.purchaseNo}`}
        subtitle={
          <>
            {formatDate(purchase.invoiceDate)} ·{" "}
            <Link href={`/parties/${purchase.companyId}`} className="text-link hover:underline">
              {purchase.companyName}
            </Link>
          </>
        }
        actions={<SampleChip />}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Items" className="lg:col-span-2">
          <ul className="divide-y divide-hairline">
            {purchase.lines.map((l, i) => {
              const p = products.find((x) => x.id === l.productId);
              return (
                <li key={i} className="flex justify-between gap-4 py-3">
                  <div>
                    <p className="text-[15px] font-medium text-ink">{p?.name}</p>
                    <p className="text-[13px] text-ink-secondary">
                      {lineQty(l.qty, p)} · {p && formatNumber(toMT(l.qty, p.unit), 3)} MT × {formatINR(l.rate)}
                    </p>
                  </div>
                  <p className="text-[15px] font-medium tabular-nums text-ink">{formatINR(l.qty * l.rate)}</p>
                </li>
              );
            })}
          </ul>
          <DetailList
            className="mt-2 border-t border-hairline"
            items={[
              { label: "Items", value: formatINR(itemsTotal) },
              { label: "Freight", value: purchase.freight ? formatINR(purchase.freight) : undefined },
            ]}
          />
          <div className="mt-2 flex items-baseline justify-between border-t border-hairline pt-3">
            <span className="text-[15px] text-ink-secondary">Total</span>
            <span className="text-[28px] font-semibold tabular-nums tracking-[-0.4px] text-ink">{formatINR(purchase.total)}</span>
          </div>
        </SectionCard>
        <SectionCard title="Lorry">
          <DetailList
            items={[
              { label: "For firm", value: firm?.name },
              { label: "Invoice no.", value: purchase.invoiceNo },
              { label: "Invoice date", value: formatDate(purchase.invoiceDate) },
              { label: "Truck received", value: formatDate(purchase.receivedDate) },
              { label: "Lorry", value: purchase.lorryNo },
              { label: "Unloaded at", value: godowns.find((g) => g.id === purchase.godownId)?.name },
            ]}
          />
        </SectionCard>
      </div>
    </>
  );
}

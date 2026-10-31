import { Printer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink, DetailList, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { buttonClass } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { SampleActionButton } from "@/components/ui/sample-action";
import { getCurrentUser, getGodowns, getProducts, getProfile, getSale } from "@/lib/data";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { saleStatus, transportLabels } from "@/lib/labels";
import { lineQty } from "@/lib/quantities";
import { toMT } from "@/lib/sales";

export const metadata: Metadata = { title: "Bill" };

export default function SalePage({ params }: PageProps<"/sales/[id]">) {
  return (
    <div className="animate-fade-up">
      <BackLink href="/sales">Sales</BackLink>
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <SaleDetail params={params} />
      </Suspense>
    </div>
  );
}

async function SaleDetail({ params }: { params: PageProps<"/sales/[id]">["params"] }) {
  const { id } = await params;
  const sale = await getSale(id);
  if (!sale) notFound();
  const [products, godowns, createdBy, user] = await Promise.all([getProducts(), getGodowns(), getProfile(sale.createdBy), getCurrentUser()]);
  const status = saleStatus[sale.status];
  const godown = godowns.find((g) => g.id === sale.godownId);

  return (
    <>
      <PageHeader
        title={`Bill ${sale.billNo}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {formatDate(sale.billDate)} · <Link href={`/parties/${sale.partyId}`} className="text-link hover:underline">{sale.partyName}</Link>
            <Chip tone={status.tone}>{status.label}</Chip>
          </span>
        }
        actions={
          <>
            <SampleChip />
            {sale.status === "pending_approval" && user.role === "owner" && (
              <>
                <SampleActionButton variant="secondary" message="Sample mode: the bill would be rejected and the staff member told why.">
                  Reject
                </SampleActionButton>
                <SampleActionButton variant="primary" message="Sample mode: approving posts the bill to the ledger and stock once Supabase is connected.">
                  Approve
                </SampleActionButton>
              </>
            )}
            {sale.status === "saved" && (
              <Link href={`/sales/${sale.id}/print`} className={buttonClass("primary")}>
                <Printer size={18} strokeWidth={1.75} aria-hidden /> Print bill
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Items" className="lg:col-span-2">
          <ul className="divide-y divide-hairline">
            {sale.lines.map((l, i) => {
              const product = products.find((p) => p.id === l.productId);
              return (
                <li key={i} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-ink">{product?.name}</p>
                    <p className="text-[13px] text-ink-secondary">
                      {lineQty(l.qty, product)} · {product && formatNumber(toMT(l.qty, product.unit), 3)} MT × {formatINR(l.rate)}
                      {l.rate !== l.listRate && <span className="text-warning"> (list {formatINR(l.listRate)})</span>}
                    </p>
                  </div>
                  <p className="shrink-0 text-[15px] font-medium tabular-nums text-ink">{formatINR(l.qty * l.rate)}</p>
                </li>
              );
            })}
          </ul>
          <DetailList
            className="mt-2 border-t border-hairline"
            items={[
              { label: "Items", value: formatINR(sale.subtotal) },
              { label: "Discount", value: sale.discountAmount ? `− ${formatINR(sale.discountAmount)}` : undefined },
              { label: "Transport", value: sale.transportCharge ? formatINR(sale.transportCharge) : undefined },
              { label: "Unloading", value: sale.unloadingCharge ? formatINR(sale.unloadingCharge) : undefined },
              { label: "Other charges", value: sale.otherCharge ? formatINR(sale.otherCharge) : undefined },
            ]}
          />
          <div className="mt-2 flex items-baseline justify-between border-t border-hairline pt-3">
            <span className="text-[15px] text-ink-secondary">Total</span>
            <span className="text-[28px] font-semibold tabular-nums tracking-[-0.4px] text-ink">{formatINR(sale.total)}</span>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Delivery">
            <DetailList
              items={[
                { label: "Load from", value: sale.source === "godown" ? godown?.name : `${sale.source === "lorry" ? "Lorry" : "Van"} ${sale.vehicleNo ?? ""}` },
                { label: "Transport", value: transportLabels[sale.transportMode] },
                { label: "Destination", value: sale.destination },
                { label: "Truck received", value: sale.receivedDate && formatDate(sale.receivedDate) },
              ]}
            />
          </SectionCard>
          <SectionCard title="Record">
            <DetailList
              items={[
                { label: "Entered by", value: createdBy?.fullName },
                { label: "Paper memo", value: sale.paperMemo },
                { label: "Remarks", value: sale.remarks },
                { label: "Reason", value: sale.overrideReason },
              ]}
            />
            {sale.status === "saved" && (
              <SampleActionButton variant="plain" className="mt-3 text-danger" message="Sample mode: cancelling asks for a reason and keeps the bill in the audit history.">
                Cancel this bill
              </SampleActionButton>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}

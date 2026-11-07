import { FileText, MessageCircle, Package, Printer, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink, DetailList, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { IconButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { RoleGuard } from "@/components/ui/sub-nav";
import { getFirms, getGodowns, getNextBillNo, getParty, getProducts, getProfile, getSale } from "@/lib/data";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { billName, saleStatus, transportLabels } from "@/lib/labels";
import { lineQty } from "@/lib/quantities";
import { toMT, unitLabel } from "@/lib/sales";
import { ConfirmRequest, type RequestLine } from "./confirm-request";
import { CancelSaleButton } from "./cancel-sale-button";

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
  const [products, godowns, createdBy, firms, nextBillNo, party] = await Promise.all([
    getProducts(),
    getGodowns(),
    getProfile(sale.createdBy),
    getFirms(),
    getNextBillNo(),
    getParty(sale.partyId),
  ]);
  const firm = firms.find((f) => f.id === sale.firmId) ?? firms[0];
  const status = saleStatus[sale.status];
  const pending = sale.status === "pending_approval";

  const waBillItems = sale.lines
    .map((l) => {
      const p = products.find((prod) => prod.id === l.productId);
      return `  ▫️ ${p?.name || "Item"}: ${l.qty} ${p?.unit ?? "bags"} @ ₹${l.rate} = ₹${formatINR(l.qty * l.rate)}`;
    })
    .join("\n");

  const waBillText = `📦 *SALE BILL #${sale.billNo}*
━━━━━━━━━━━━━━━━━━━
*${firm.name}*
Polaki, Srikakulam Dist.

నమస్కారం *${sale.partyName}* గారు,
మీ సేల్స్ బిల్లు వివరాలు:

• *Bill No:* #${sale.billNo}
• *Date:* ${sale.billDate}
• *Items:*
${waBillItems}
• *Total Bill Amount:* *₹${formatINR(sale.total)}*

📞 సంప్రదించండి: *${firm.phone}* / 99636 84551
━━━━━━━━━━━━━━━━━━━`;

  const waBillLink = party?.mobile
    ? `https://wa.me/91${party.mobile}?text=${encodeURIComponent(waBillText)}`
    : undefined;
  const requestLines: RequestLine[] = sale.lines.map((l) => {
    const product = products.find((p) => p.id === l.productId);
    const unit = product?.unit ?? "bag";
    return {
      productId: l.productId,
      name: product?.name ?? "Item",
      unit,
      unitLabel: unitLabel[unit] || unit,
      qty: l.qty,
      mt: toMT(l.qty, unit),
      initialRate: l.rate > 0 ? l.rate : undefined,
    };
  });
  const godown = godowns.find((g) => g.id === sale.godownId);

  return (
    <>
      <PageHeader
        title={billName(sale)}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {formatDate(sale.billDate)} · <Link href={`/parties/${sale.partyId}`} className="text-link hover:underline">{sale.partyName}</Link>
            <Chip tone={status.tone}>{status.label}</Chip>
            {firms.length > 1 && <Chip tone="accent">{firm.name}</Chip>}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <SampleChip />
            {sale.status === "saved" && party?.mobile && (
              <a
                href={waBillLink}
                target="_blank"
                rel="noopener noreferrer"
                title="Send bill on WhatsApp"
                aria-label="Send bill on WhatsApp"
                className="grid size-10 place-items-center rounded-2xl bg-good-soft text-good hover:opacity-90 transition-opacity"
              >
                <MessageCircle size={19} strokeWidth={1.9} aria-hidden />
              </a>
            )}
            {sale.status === "saved" && (
              <IconButtonLink href={`/sales/${sale.id}/print`} label="Print bill" variant="primary">
                <Printer size={19} strokeWidth={1.9} aria-hidden />
              </IconButtonLink>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {pending ? (
          // A staff sale: the owner gives it a bill no. and prices and approves it; everyone else sees the items.
          <RoleGuard
            roles={["owner"]}
            fallback={
              <SectionCard title="Items" icon={Package} iconTone="accent" className="lg:col-span-2">
                <ul className="divide-y divide-hairline">
                  {requestLines.map((l, i) => (
                    <li key={i} className="flex justify-between gap-4 py-3 text-[15px]">
                      <span className="text-ink">{l.name}</span>
                      <span className="tabular-nums text-ink-secondary">
                        {formatNumber(l.qty)} {l.unitLabel}{l.mt > 0 ? ` · ${formatNumber(l.mt, 3)} MT` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[13px] text-ink-secondary">Waiting for the owner to add the bill no. and prices and approve it.</p>
              </SectionCard>
            }
          >
            <ConfirmRequest
              saleId={sale.id}
              lines={requestLines}
              requestedBy={createdBy?.fullName}
              transportMode={sale.transportMode}
              nextBillNo={sale.billNo ?? nextBillNo}
            />
          </RoleGuard>
        ) : (
          <SectionCard title="Items" icon={Package} iconTone="accent" className="lg:col-span-2">
            <ul className="divide-y divide-hairline">
              {sale.lines.map((l, i) => {
                const product = products.find((p) => p.id === l.productId);
                return (
                  <li key={i} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-ink">{product?.name}</p>
                      <p className="text-[13px] text-ink-secondary">
                        {lineQty(l.qty, product)}{product && toMT(l.qty, product.unit) > 0 ? ` · ${formatNumber(toMT(l.qty, product.unit), 3)} MT` : ""} × {formatINR(l.rate)}
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
        )}

        <div className="space-y-4">
          <SectionCard title="Delivery" icon={Truck} iconTone="teal">
            <DetailList
              items={[
                { label: "Load from", value: sale.source === "godown" ? godown?.name : `${sale.source === "lorry" ? "Lorry" : "Van"} ${sale.vehicleNo ?? ""}` },
                { label: "Transport", value: transportLabels[sale.transportMode] },
                { label: "Destination", value: sale.destination },
                { label: "Truck received", value: sale.receivedDate && formatDate(sale.receivedDate) },
              ]}
            />
          </SectionCard>
          <SectionCard title="Record" icon={FileText} iconTone="neutral">
            <DetailList
              items={[
                { label: "Sales bill no.", value: sale.billNo ? `#${sale.billNo}` : "Pending assignment" },
                { label: "Entered by", value: createdBy?.fullName },
                { label: "Paper memo", value: sale.paperMemo },
                { label: "Remarks", value: sale.remarks },
                { label: "Reason", value: sale.overrideReason },
              ]}
            />
            {sale.status === "saved" && (
              <CancelSaleButton saleId={sale.id} billNo={sale.billNo} />
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}

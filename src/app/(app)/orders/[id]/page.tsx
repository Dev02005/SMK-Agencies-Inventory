import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink, DetailList, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmOrderButton, CancelOrderButton } from "./order-status-buttons";
import { getGodowns, getOrder, getProducts } from "@/lib/data";
import { formatDate, formatINR } from "@/lib/format";
import { orderSourceLabels, orderStatus } from "@/lib/labels";
import { lineQty } from "@/lib/quantities";

export const metadata: Metadata = { title: "Order" };

export default function OrderPage({ params }: PageProps<"/orders/[id]">) {
  return (
    <div className="animate-fade-up">
      <BackLink href="/orders">Orders</BackLink>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <OrderDetail params={params} />
      </Suspense>
    </div>
  );
}

async function OrderDetail({ params }: { params: PageProps<"/orders/[id]">["params"] }) {
  const { id } = await params;
  const [order, products, godowns] = await Promise.all([getOrder(id), getProducts(), getGodowns()]);
  if (!order) notFound();
  const status = orderStatus[order.status];
  const open = order.status === "new" || order.status === "confirmed" || order.status === "partly_dispatched";

  return (
    <>
      <PageHeader
        title={`Order #${order.orderNo}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {formatDate(order.date)} ·{" "}
            <Link href={`/parties/${order.partyId}`} className="text-link hover:underline">
              {order.partyName}
            </Link>
            <Chip tone={status.tone}>{status.label}</Chip>
          </span>
        }
        actions={
          <>
            {order.status === "new" && (
              <ConfirmOrderButton orderId={order.id} />
            )}
            {open && <ButtonLink href="/sales/new">Make bill and send</ButtonLink>}
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Items" className="lg:col-span-2">
          <ul className="divide-y divide-hairline">
            {order.lines.map((l) => {
              const p = products.find((x) => x.id === l.productId);
              const left = l.qty - l.dispatched;
              return (
                <li key={l.productId} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-[15px] font-medium text-ink">{p?.name}</p>
                    <p className="text-[13px] text-ink-secondary">
                      Ordered {lineQty(l.qty, p)} · sent {lineQty(l.dispatched, p)}
                    </p>
                  </div>
                  {left > 0 ? <Chip tone="warning">{lineQty(left, p)} to send</Chip> : <Chip tone="good">All sent</Chip>}
                </li>
              );
            })}
          </ul>
          {order.bills.length > 0 && (
            <div className="mt-3 border-t border-hairline pt-3">
              <p className="mb-1 text-[13px] text-ink-secondary">Bills against this order</p>
              {order.bills.map((b) => (
                <Link key={b.id} href={`/sales/${b.id}`} className="flex justify-between py-1.5 text-[15px] text-link hover:underline">
                  <span>
                    Bill {b.billNo} · {formatDate(b.date)}
                  </span>
                  <span className="tabular-nums">{formatINR(b.total)}</span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title="Details">
          <DetailList
            items={[
              { label: "Taken by", value: order.takenByName },
              { label: "How", value: orderSourceLabels[order.source] },
              { label: "Load from", value: godowns.find((g) => g.id === order.godownId)?.name },
              { label: "Deliver by", value: order.deliverBy && formatDate(order.deliverBy) },
              { label: "Destination", value: order.destination },
              { label: "Remarks", value: order.remarks },
            ]}
          />
          {open && (
            <CancelOrderButton orderId={order.id} />
          )}
        </SectionCard>
      </div>
    </>
  );
}

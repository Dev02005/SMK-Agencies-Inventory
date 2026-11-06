import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink, DetailList, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/ui/data-table";
import { DataTools } from "@/components/ui/data-tools";
import { PageHeader } from "@/components/ui/page-header";
import { SampleActionButton } from "@/components/ui/sample-action";
import { getCommitment } from "@/lib/data";
import { formatDate, formatINR, formatNumber, formatShortDate } from "@/lib/format";
import { billName, paymentModeLabels } from "@/lib/labels";

export const metadata: Metadata = { title: "Advance" };

export default function AdvancePage({ params }: PageProps<"/money/advances/[id]">) {
  return (
    <div className="animate-fade-up">
      <BackLink href="/money/advances">Advances</BackLink>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <AdvanceDetail params={params} />
      </Suspense>
    </div>
  );
}

async function AdvanceDetail({ params }: { params: PageProps<"/money/advances/[id]">["params"] }) {
  const { id } = await params;
  const c = await getCommitment(id);
  if (!c) notFound();
  const fixed = c.kind === "fixed_price";

  return (
    <>
      <PageHeader
        title={c.partyName}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {fixed ? `${formatNumber(c.bags ?? 0)} bags ${c.productName} at ${formatINR(c.rate ?? 0)} a bag` : "Advance against future bills"}
            <Chip tone={c.status === "active" ? "accent" : "good"}>{c.status === "active" ? "Open" : "Completed"}</Chip>
          </span>
        }
        actions={
          <>
            <SampleChip />
            <SampleActionButton message="A refund has been recorded as a payment to close this advance.">Refund balance</SampleActionButton>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Balance" className="lg:col-span-1">
          {fixed && (
            <>
              <p className="text-[13px] text-ink-secondary">Bags still to supply</p>
              <p className="text-[34px] font-semibold leading-[41px] tracking-[-0.4px] tabular-nums text-ink">{formatNumber(c.remainingBags)}</p>
              <p className="text-[13px] text-ink-secondary">of {formatNumber(c.bags ?? 0)} committed · {formatNumber(c.remainingBags / 20)} MT</p>
            </>
          )}
          <DetailList
            className={fixed ? "mt-3 border-t border-hairline" : undefined}
            items={[
              { label: "Received", value: formatINR(c.amount) },
              { label: "Adjusted against bills", value: formatINR(c.adjusted) },
              { label: "Remaining", value: <span className="font-semibold">{formatINR(c.remainingAmount)}</span> },
            ]}
          />
        </SectionCard>
        <SectionCard title="Advance details" className="lg:col-span-2">
          <DetailList
            items={[
              { label: "Paid on", value: formatDate(c.date) },
              { label: "Mode", value: paymentModeLabels[c.mode] },
              { label: "Party ledger", value: <Link href={`/parties/${c.partyId}`} className="text-link hover:underline">Open ledger ›</Link> },
              { label: "Terms", value: c.terms },
            ]}
          />
          <p className="mt-3 text-[13px] text-ink-secondary">
            {fixed
              ? "Each bill to this party for this product uses the fixed rate and reduces the bags left, until all bags are supplied. The same bags can't be used twice."
              : "Each new bill to this party is adjusted against the advance until it is used up."}
          </p>
        </SectionCard>
      </div>

      <h2 className="mb-3 mt-6 text-[22px] font-semibold tracking-[-0.3px] text-ink">{fixed ? "Supplied against this advance" : "Bills adjusted"}</h2>
      <DataTools title={fixed ? "Supplied against advance" : "Bills adjusted"} dated={false} className="mb-4" />
      <DataTable
        rows={c.supplies}
        rowKey={(s) => s.saleId}
        rowHref={(s) => `/sales/${s.saleId}`}
        empty="Nothing supplied yet."
        mobile={(s) => ({
          title: billName(s),
          subtitle: formatShortDate(s.date),
          value: fixed ? `${formatNumber(s.bags)} bags` : formatINR(s.amount),
          meta: fixed && <span className="text-[12px] text-ink-secondary">{formatINR(s.amount)}</span>,
        })}
        columns={[
          { key: "bill", header: "Bill", cell: (s) => `#${s.billNo}` },
          { key: "date", header: "Date", cell: (s) => formatDate(s.date), className: "text-ink-secondary" },
          ...(fixed ? [{ key: "bags", header: "Bags", align: "right" as const, cell: (s: (typeof c.supplies)[number]) => formatNumber(s.bags) }] : []),
          { key: "amount", header: "Adjusted", align: "right", cell: (s) => formatINR(s.amount) },
        ]}
      />
    </>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/ui/data-table";
import { DataTools } from "@/components/ui/data-tools";
import { PageHeader } from "@/components/ui/page-header";
import { getQuotations } from "@/lib/data";
import { inDateFilter } from "@/lib/date-filter";
import { formatDate, formatINR, formatShortDate } from "@/lib/format";
import { quotationStatus } from "@/lib/labels";
import { pageDateFilter } from "@/lib/page-dates";

export const metadata: Metadata = { title: "Quotations" };

export default function QuotationsPage({ searchParams }: PageProps<"/quotations">) {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Quotations"
        subtitle="Quotations and estimates in the SKA format"
        actions={
          <>
            <SampleChip />
            <ButtonLink href="/quotations/new">New quotation</ButtonLink>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <QuotationsTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function QuotationsTable({ searchParams }: { searchParams: PageProps<"/quotations">["searchParams"] }) {
  const [all, dates] = await Promise.all([getQuotations(), pageDateFilter(searchParams)]);
  const quotations = all.filter((q) => inDateFilter(q.date, dates));
  const total = (q: (typeof quotations)[number]) => q.lines.reduce((s, l) => s + l.qty * l.rate, 0);
  return (
    <div className="space-y-4">
      <DataTools title="Quotations" />
      <DataTable
        rows={quotations}
        empty="No quotations for these dates."
        rowKey={(q) => q.id}
        rowHref={(q) => `/quotations/${q.id}`}
        mobile={(q) => ({
          title: q.clientName,
          subtitle: `${q.quoteNo} · ${formatShortDate(q.date)} · ${q.lines.map((l) => l.description).join(", ")}`,
          value: formatINR(total(q)),
          meta: <Chip tone={quotationStatus[q.status].tone}>{quotationStatus[q.status].label}</Chip>,
        })}
        columns={[
          { key: "no", header: "Quote no.", cell: (q) => q.quoteNo, className: "whitespace-nowrap" },
          { key: "date", header: "Date", cell: (q) => formatDate(q.date), className: "whitespace-nowrap text-ink-secondary" },
          { key: "client", header: "Client", cell: (q) => q.clientName },
          {
            key: "items",
            header: "Items",
            cell: (q) => q.lines.map((l) => l.description).join(", "),
            className: "hidden text-ink-secondary lg:table-cell",
          },
          { key: "total", header: "Amount", align: "right", cell: (q) => formatINR(total(q)) },
          { key: "status", header: "", cell: (q) => <Chip tone={quotationStatus[q.status].tone}>{quotationStatus[q.status].label}</Chip> },
        ]}
      />
    </div>
  );
}

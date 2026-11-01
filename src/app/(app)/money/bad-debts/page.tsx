import type { Metadata } from "next";
import { Suspense } from "react";
import { SimpleForm } from "@/components/forms/simple-form";
import { ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { DataTable } from "@/components/ui/data-table";
import { DataTools } from "@/components/ui/data-tools";
import { PageHeader } from "@/components/ui/page-header";
import { getAgeingReport, getBadDebts } from "@/lib/data";
import { inDateFilter } from "@/lib/date-filter";
import { formatDate, formatINR, formatShortDate } from "@/lib/format";
import { pageDateFilter } from "@/lib/page-dates";

export const metadata: Metadata = { title: "Bad debts" };

export default function BadDebtsPage({ searchParams }: PageProps<"/money/bad-debts">) {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Bad debts"
        subtitle="Amounts the owner has decided not to collect. Each one closes that much of the party's balance."
        actions={<SampleChip />}
      />
      <Suspense fallback={<ListSkeleton />}>
        <BadDebtsData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function BadDebtsData({ searchParams }: { searchParams: PageProps<"/money/bad-debts">["searchParams"] }) {
  const [all, ageing, dates] = await Promise.all([getBadDebts(), getAgeingReport(), pageDateFilter(searchParams)]);
  const debts = all.filter((d) => inDateFilter(d.date, dates));
  const oldDebtors = ageing.filter((r) => r.ageing["61-90"] + r.ageing["90+"] + r.ageing["31-60"] > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-3 lg:col-span-3">
        <DataTools title="Bad debts" />
        <DataTable
          rows={debts}
          rowKey={(d) => d.id}
          rowHref={(d) => `/parties/${d.partyId}`}
          empty="Nothing written off in these dates."
          mobile={(d) => ({ title: d.partyName, subtitle: `${formatShortDate(d.date)} · ${d.reason}`, value: formatINR(d.amount) })}
          columns={[
            { key: "party", header: "Party", cell: (d) => d.partyName },
            { key: "date", header: "Date", cell: (d) => formatDate(d.date), className: "whitespace-nowrap text-ink-secondary" },
            { key: "reason", header: "Reason", cell: (d) => d.reason, className: "text-ink-secondary" },
            { key: "by", header: "Approved by", cell: (d) => d.approvedByName, className: "hidden text-ink-secondary xl:table-cell" },
            { key: "amount", header: "Amount", align: "right", cell: (d) => formatINR(d.amount) },
          ]}
        />
        <p className="px-1 text-[13px] text-ink-secondary">
          Written-off amounts stay in the party ledger as a separate line, so they still show up in reports and can be reversed if the party pays later.
        </p>
      </div>
      <SectionCard title="Write off an amount" className="lg:col-span-2">
        <SimpleForm
          thing="write-off"
          submitLabel="Write off"
          fields={[
            {
              name: "party",
              label: "Party",
              type: "select",
              wide: true,
              options: oldDebtors.map((r) => ({ value: r.id, label: `${r.name} · ${formatINR(r.unpaid)} unpaid` })),
              hint: "Only parties with amounts over 30 days old",
            },
            { name: "amount", label: "Amount", type: "number", prefix: "₹", required: true, wide: true },
            { name: "reason", label: "Reason", type: "textarea", required: true, wide: true, placeholder: "e.g. Party closed the shop; not reachable" },
          ]}
        />
      </SectionCard>
    </div>
  );
}

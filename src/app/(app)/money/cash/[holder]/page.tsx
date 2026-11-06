import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTools } from "@/components/ui/data-tools";
import { PageHeader } from "@/components/ui/page-header";
import { SampleActionButton } from "@/components/ui/sample-action";
import { cn } from "@/lib/cn";
import { getCashBook } from "@/lib/data";
import { inDateFilter } from "@/lib/date-filter";
import { formatDate, formatINR, formatShortDate } from "@/lib/format";
import { roleLabels } from "@/lib/labels";
import { pageDateFilter } from "@/lib/page-dates";
import { CountChip } from "../count-chip";

export const metadata: Metadata = { title: "Cash book" };

export default function CashBookPage({ params, searchParams }: PageProps<"/money/cash/[holder]">) {
  return (
    <div className="animate-fade-up">
      <BackLink href="/money/cash">Staff cash</BackLink>
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <CashBook params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const signed = (n: number) => (n >= 0 ? `+ ${formatINR(n)}` : `− ${formatINR(-n)}`);

async function CashBook({ params, searchParams }: Pick<PageProps<"/money/cash/[holder]">, "params" | "searchParams">) {
  const { holder } = await params;
  const [book, dates] = await Promise.all([getCashBook(holder), pageDateFilter(searchParams)]);
  if (!book) notFound();
  const t = book.today;
  const difference = t.counted === undefined ? undefined : t.counted - t.closing;

  return (
    <>
      <PageHeader
        title={book.name}
        subtitle={book.holder === "office" ? "Office cash box" : `${roleLabels[book.role]} · cash book`}
        actions={
          <>
            <SampleChip />
            <SampleActionButton message="Counted cash balance verified and logged.">Count cash</SampleActionButton>
            <ButtonLink href="/money/cash/handover/new">Hand over</ButtonLink>
          </>
        }
      />

      <SectionCard title={`Today · ${formatDate(t.date)}`} action={<CountChip counted={t.counted} difference={difference} />}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Opening", value: formatINR(t.opening) },
            { label: "Cash in", value: `+ ${formatINR(t.cashIn)}`, tone: "text-good" },
            { label: "Cash out", value: `− ${formatINR(t.cashOut)}` },
            { label: "Closing", value: formatINR(t.closing), big: true },
          ].map((x) => (
            <div key={x.label}>
              <p className="text-[13px] text-ink-secondary">{x.label}</p>
              <p className={cn("tabular-nums", x.big ? "text-[28px] font-semibold tracking-[-0.4px]" : "text-[20px] font-medium", x.tone ?? "text-ink")}>{x.value}</p>
            </div>
          ))}
        </div>
        {t.counted !== undefined && (
          <p className="mt-3 text-[13px] text-ink-secondary">
            Counted {formatINR(t.counted)} against the expected {formatINR(t.closing)}.
          </p>
        )}
      </SectionCard>

      <DataTools title={`Cash book ${book.name}`} className="mt-4" />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-[22px] font-semibold tracking-[-0.3px] text-ink">Day by day</h2>
          <DataTable
            rows={book.days.filter((d) => inDateFilter(d.date, dates))}
            empty="No days in these dates."
            rowKey={(d) => d.date}
            mobile={(d) => ({
              title: formatDate(d.date),
              subtitle: `${formatINR(d.opening)} + ${formatINR(d.cashIn)} − ${formatINR(d.cashOut)}`,
              value: formatINR(d.closing),
            })}
            columns={[
              { key: "date", header: "Date", cell: (d) => formatShortDate(d.date), className: "whitespace-nowrap" },
              { key: "opening", header: "Opening", align: "right", cell: (d) => formatINR(d.opening) },
              { key: "in", header: "In", align: "right", cell: (d) => (d.cashIn ? formatINR(d.cashIn) : "") },
              { key: "out", header: "Out", align: "right", cell: (d) => (d.cashOut ? formatINR(d.cashOut) : "") },
              { key: "closing", header: "Closing", align: "right", cell: (d) => <span className="font-medium">{formatINR(d.closing)}</span> },
            ]}
          />
        </div>
        <div>
          <h2 className="mb-3 text-[22px] font-semibold tracking-[-0.3px] text-ink">Entries</h2>
          <DataTable
            rows={book.entries.filter((e) => inDateFilter(e.date, dates)).slice(0, 40)}
            empty="No entries in these dates."
            rowKey={(e) => `${e.date}-${e.description}-${e.amount}`}
            rowHref={(e) => e.href}
            mobile={(e) => ({
              title: e.description,
              subtitle: formatShortDate(e.date),
              value: <span className={e.amount > 0 ? "text-good" : undefined}>{signed(e.amount)}</span>,
            })}
            columns={[
              { key: "date", header: "Date", cell: (e) => formatShortDate(e.date), className: "whitespace-nowrap text-ink-secondary" },
              {
                key: "what",
                header: "Entry",
                cell: (e) => (e.href ? <Link href={e.href} className="hover:text-link hover:underline">{e.description}</Link> : e.description),
              },
              { key: "amount", header: "Amount", align: "right", cell: (e) => <span className={e.amount > 0 ? "text-good" : undefined}>{signed(e.amount)}</span> },
            ]}
          />
        </div>
      </div>
    </>
  );
}

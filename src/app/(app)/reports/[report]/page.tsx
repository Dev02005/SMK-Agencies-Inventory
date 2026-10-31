import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExportButtons } from "@/components/reports/export-buttons";
import { ReportTable } from "@/components/reports/report-table";
import { BackLink, ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { RoleGuard } from "@/components/ui/sub-nav";
import { cn } from "@/lib/cn";
import { getCurrentUser, getFirm, getToday } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { findReport, periodLabels, periodRange, reports, type Period } from "@/lib/reports";

export function generateStaticParams() {
  return reports.map((r) => ({ report: r.key }));
}

export async function generateMetadata({ params }: PageProps<"/reports/[report]">): Promise<Metadata> {
  const { report } = await params;
  return { title: findReport(report)?.title ?? "Report" };
}

type Params = PageProps<"/reports/[report]">["params"];
type SearchParams = PageProps<"/reports/[report]">["searchParams"];

export default function ReportPage({ params, searchParams }: PageProps<"/reports/[report]">) {
  return (
    <RoleGuard roles={["owner", "office"]}>
      <div className="print:hidden">
        <BackLink href="/reports">Reports</BackLink>
        <Suspense fallback={<div className="mb-5 h-[66px] md:mb-7" />}>
          <ReportHeading params={params} />
        </Suspense>
      </div>
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <ReportBody params={params} searchParams={searchParams} />
      </Suspense>
    </RoleGuard>
  );
}

async function ReportHeading({ params }: { params: Params }) {
  const def = findReport((await params).report);
  if (!def) notFound();
  return <PageHeader title={def.title} subtitle={def.description} actions={<SampleChip />} />;
}

function OptionLinks({ label, items }: { label: string; items: { href: string; label: string; current: boolean }[] }) {
  return (
    <nav aria-label={label} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          scroll={false}
          replace
          aria-current={i.current ? "true" : undefined}
          className={cn(
            "flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-[14px] transition-colors",
            i.current ? "bg-accent-soft font-medium text-accent" : "border border-hairline bg-card text-ink-secondary hover:text-ink",
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

async function ReportBody({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const def = findReport((await params).report);
  if (!def) notFound();
  const sp = await searchParams;
  const asked = typeof sp.period === "string" ? sp.period : undefined;
  const period: Period = def.periods?.find((p) => p === asked) ?? def.periods?.[0] ?? "today";
  const by = def.groupings?.find((g) => g.key === sp.by)?.key ?? def.groupings?.[0]?.key;

  const [result, firm, user] = await Promise.all([def.run(period, by), getFirm(), getCurrentUser()]);
  const periodLabel = def.periods ? periodRange(period).label : `As of ${formatDate(getToday())}`;
  const groupingLabel = def.groupings?.find((g) => g.key === by)?.label;
  const href = (p: Period | undefined, b: string | undefined) => {
    const q = new URLSearchParams();
    if (p && p !== def.periods?.[0]) q.set("period", p);
    if (b && b !== def.groupings?.[0]?.key) q.set("by", b);
    const s = q.toString();
    return `/reports/${def.key}${s ? `?${s}` : ""}`;
  };
  const wide = result.columns.length >= 8;

  return (
    <div className={cn("space-y-4", wide && "print-landscape")}>
      <div className="flex flex-col gap-3 print:hidden lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          {def.periods && (
            <OptionLinks label="Period" items={def.periods.map((p) => ({ href: href(p, by), label: periodLabels[p], current: p === period }))} />
          )}
          {def.groupings && (
            <OptionLinks label="Group by" items={def.groupings.map((g) => ({ href: href(period, g.key), label: g.label, current: g.key === by }))} />
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <ExportButtons
            firmName={firm.name}
            title={def.title}
            periodLabel={[groupingLabel, periodLabel].filter(Boolean).join(" · ")}
            fileName={`SKA ${def.title} ${def.periods ? periodLabels[period] : getToday()}`.replace(/[^\w -]+/g, "").replace(/\s+/g, " ")}
            columns={result.columns}
            rows={result.rows}
            totals={result.totals}
            wide={wide}
          />
        </div>
      </div>

      <p className="text-[13px] text-ink-secondary print:hidden">
        {periodLabel}
        {groupingLabel && ` · ${groupingLabel.toLowerCase()}`} · {result.rows.length} {result.rows.length === 1 ? "row" : "rows"}
      </p>

      <header className="hidden border-b-2 border-[#0071e3] pb-2 text-[#1d1d1f] print:block">
        <p className="text-[16px] font-bold uppercase tracking-[-0.2px]">{firm.name}</p>
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[14px] font-semibold">
            {def.title}
            {groupingLabel && <span className="font-normal"> · {groupingLabel.toLowerCase()}</span>}
          </p>
          <p className="text-[11px] text-[#6e6e73]">
            {periodLabel} · printed {formatDate(getToday())} by {user.fullName}
          </p>
        </div>
      </header>

      <ReportTable result={result} />

      {result.note && <p className="text-[13px] text-ink-secondary print:text-[10px] print:text-[#6e6e73]">{result.note}</p>}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReportTable } from "@/components/reports/report-table";
import { BackLink, ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { DateFilterBar } from "@/components/ui/date-filter";
import { ExportMenu } from "@/components/ui/export-menu";
import { PageHeader } from "@/components/ui/page-header";
import { RoleGuard } from "@/components/ui/sub-nav";
import { cn } from "@/lib/cn";
import { getCurrentUser, getFirm, getToday } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { resolveDateFilter } from "@/lib/date-filter";
import { findReport, reports } from "@/lib/reports";

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
  // Checked here, before the report runs: reports are for the owner and the office; People and Vehicles for the owner alone.
  const viewer = await getCurrentUser();
  if (viewer.role !== "owner" && (viewer.role !== "office" || def.group === "People" || def.group === "Vehicles")) {
    return <div className="surface px-6 py-12 text-center text-[15px] text-ink-secondary">Only the owner can see this report.</div>;
  }
  const [sp, today] = await Promise.all([searchParams, getToday()]);
  const by = def.groupings?.find((g) => g.key === sp.by)?.key ?? def.groupings?.[0]?.key;
  // Reports without date choices are "as of today": every date is included.
  const dates = resolveDateFilter(def.periods ? sp : {}, today, def.periods ?? ["all"]);

  const [result, firm, user] = await Promise.all([def.run(dates, by), getFirm(), getCurrentUser()]);
  const periodLabel = def.periods ? dates.label : `As of ${formatDate(today)}`;
  const groupingLabel = def.groupings?.find((g) => g.key === by)?.label;
  // Changing the grouping keeps the dates already chosen.
  const href = (b: string | undefined) => {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) if (typeof value === "string" && key !== "by") q.set(key, value);
    if (b && b !== def.groupings?.[0]?.key) q.set("by", b);
    const s = q.toString();
    return `/reports/${def.key}${s ? `?${s}` : ""}`;
  };
  const wide = result.columns.length >= 8;

  return (
    <div className={cn("space-y-4", wide && "print-landscape")}>
      <div className="flex flex-col gap-3 print:hidden lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          {def.periods && <DateFilterBar presets={def.periods} />}
          {def.groupings && <OptionLinks label="Group by" items={def.groupings.map((g) => ({ href: href(g.key), label: g.label, current: g.key === by }))} />}
        </div>
        <div className="flex shrink-0 gap-2">
          <ExportMenu
            title={def.title}
            subtitle={[groupingLabel, periodLabel].filter(Boolean).join(" · ")}
            tables={[
              {
                columns: result.columns.map((c) => ({ label: c.label, kind: c.kind })),
                rows: result.rows.map((r) => result.columns.map((c) => r[c.key])),
                totals: result.totals ? [result.columns.map((c) => result.totals?.[c.key])] : [],
              },
            ]}
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
            {periodLabel} · printed {formatDate(today)} by {user.fullName}
          </p>
        </div>
      </header>

      <ReportTable result={result} />

      {result.note && <p className="text-[13px] text-ink-secondary print:text-[10px] print:text-[#6e6e73]">{result.note}</p>}
    </div>
  );
}

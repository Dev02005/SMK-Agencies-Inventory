import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SampleChip, SectionCard } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { RoleGuard } from "@/components/ui/sub-nav";
import { reports, type ReportDef } from "@/lib/reports";

export const metadata: Metadata = { title: "Reports" };

const groups: ReportDef["group"][] = ["Money", "Sales", "Stock", "People", "Vehicles", "Activity"];

/** Statements that already live on their own screens, so the owner finds every report from one place. */
const elsewhere = [
  { href: "/parties", title: "Party ledger and statement", description: "Open a party, then print or share its statement" },
  { href: "/money/cash", title: "Staff cash book", description: "Day-by-day cash with each staff member" },
  { href: "/money/banks", title: "Bank book", description: "Each account with a running balance" },
  { href: "/people/salary", title: "Salary sheet", description: "This month's salary, loans and advances" },
  { href: "/fleet/drivers", title: "Driver ledger", description: "Cash with each driver and hired lorry dues" },
  { href: "/stock/lorries", title: "Lorry stock", description: "Lorries sold straight off the truck" },
];

function ReportLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <li>
      <Link href={href} className="-mx-5 flex items-center gap-3 px-5 py-3 hover:bg-card-subtle md:-mx-6 md:px-6">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] text-ink">{title}</span>
          <span className="block text-[13px] text-ink-secondary">{description}</span>
        </span>
        <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-ink-tertiary" aria-hidden />
      </Link>
    </li>
  );
}

export default function ReportsPage() {
  return (
    <RoleGuard roles={["owner", "office"]}>
      <div className="animate-fade-up">
        <PageHeader title="Reports" subtitle="Pick a report, choose the period, then download Excel or save as PDF." actions={<SampleChip />} />
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((g) => (
            <SectionCard key={g} title={g}>
              <ul className="-mb-2 divide-y divide-hairline">
                {reports
                  .filter((r) => r.group === g)
                  .map((r) => (
                    <ReportLink key={r.key} href={`/reports/${r.key}`} title={r.title} description={r.description} />
                  ))}
              </ul>
            </SectionCard>
          ))}
          <SectionCard title="On their own screens" className="md:col-span-2">
            <ul className="-mb-2 divide-y divide-hairline md:grid md:grid-cols-2 md:gap-x-12 md:divide-y-0">
              {elsewhere.map((r) => (
                <ReportLink key={r.href} {...r} />
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </RoleGuard>
  );
}

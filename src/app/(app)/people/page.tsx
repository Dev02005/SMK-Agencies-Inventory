import { ChevronRight, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AttendanceChip } from "@/components/people/attendance-chip";
import { ListSkeleton, SampleChip, StatCard, StatRow } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { RoleGuard } from "@/components/ui/sub-nav";
import { getEmployees } from "@/lib/data";
import { roleLabels } from "@/lib/labels";

export const metadata: Metadata = { title: "People" };

export default function PeoplePage() {
  return (
    <>
      <PageHeader
        title="People"
        subtitle="Staff and drivers, today's attendance and their areas"
        actions={
          <>
            <SampleChip />
            <RoleGuard roles={["owner", "office"]} fallback={null}>
              <ButtonLink href="/people/new">New employee</ButtonLink>
            </RoleGuard>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <Staff />
      </Suspense>
    </>
  );
}

async function Staff() {
  const staff = await getEmployees();
  const present = staff.filter((s) => s.today?.status === "present" || s.today?.status === "half_day").length;
  const late = staff.filter((s) => s.today?.late).length;

  return (
    <div className="space-y-4">
      <StatRow>
        <StatCard label="Present today" value={`${present} of ${staff.length}`} tone="good" />
        <StatCard label="Late today" value={late} tone={late ? "warning" : undefined} />
        <StatCard label="Parties with staff" value={staff.reduce((s, e) => s + e.partiesCount, 0)} hint="assigned to sales staff" />
      </StatRow>
      <ul className="grid gap-4 md:grid-cols-2">
        {staff.map((e) => (
          <li key={e.id}>
            <Link href={`/people/${e.id}`} className="surface flex items-start gap-4 p-5 transition hover:shadow-raised">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-[15px] font-semibold text-accent">{e.initials}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[17px] font-semibold tracking-[-0.3px] text-ink">{e.fullName}</span>
                  <Chip>{roleLabels[e.role]}</Chip>
                </span>
                <span className="mt-0.5 block text-[13px] text-ink-secondary">{e.designation}</span>
                <span className="mt-2 flex flex-wrap items-center gap-2">
                  <AttendanceChip record={e.today} />
                  {e.today?.location && (
                    <span className="flex items-center gap-1 text-[12px] text-ink-secondary">
                      <MapPin size={13} strokeWidth={1.75} aria-hidden /> {e.today.location}
                    </span>
                  )}
                </span>
                <span className="mt-2 block text-[13px] text-ink-secondary">
                  {e.areas.join(", ")}
                  {e.partiesCount > 0 && ` · ${e.partiesCount} parties`} · {e.month.present} of {e.month.workingDays} days present
                </span>
              </span>
              <ChevronRight size={18} strokeWidth={1.75} className="mt-1 text-ink-tertiary" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AttendanceChip } from "@/components/people/attendance-chip";
import { ListSkeleton, SampleChip, StatCard, StatRow } from "@/components/ui/blocks";
import { DataTable } from "@/components/ui/data-table";
import { DataTools } from "@/components/ui/data-tools";
import { PageHeader } from "@/components/ui/page-header";
import { Today } from "@/components/ui/today";
import { SampleActionButton } from "@/components/ui/sample-action";
import { getAttendanceCorrections, getAttendanceRecords, getAttendanceToday, getToday } from "@/lib/data";
import { inDateFilter, type DatePreset } from "@/lib/date-filter";
import { formatDate, formatMonth, formatShortDate } from "@/lib/format";
import { roleLabels } from "@/lib/labels";
import { pageDateFilter } from "@/lib/page-dates";
import { CheckInCard } from "./check-in-card";

export const metadata: Metadata = { title: "Attendance" };

// The records list starts on today: every day of every person is a lot of rows.
const recordDates: DatePreset[] = ["today", "7d", "month", "all"];

export default function AttendancePage({ searchParams }: PageProps<"/people/attendance">) {
  return (
    <>
      <PageHeader title="Attendance" subtitle={<><Today />. Weekly off on Sundays.</>} actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton />}>
        <AttendanceData searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function AttendanceData({ searchParams }: { searchParams: PageProps<"/people/attendance">["searchParams"] }) {
  const [rows, corrected, all, dates] = await Promise.all([
    getAttendanceToday(),
    getAttendanceCorrections(),
    getAttendanceRecords(),
    pageDateFilter(searchParams, recordDates),
  ]);
  const present = rows.filter((r) => r.record?.status === "present" || r.record?.status === "half_day").length;
  const records = all.filter((r) => inDateFilter(r.date, dates));

  return (
    <div className="space-y-4">
      {/* "View as" shows the first person of each role, matching the profile in the top bar. */}
      <CheckInCard
        checkedInAt={Object.fromEntries(rows.filter((r, i, all) => all.findIndex((x) => x.role === r.role) === i).map((r) => [r.role, r.record?.checkIn]))}
      />

      <StatRow>
        <StatCard label="Present" value={`${present} of ${rows.length}`} tone="good" />
        <StatCard label="Late" value={rows.filter((r) => r.record?.late).length} tone="warning" />
        <StatCard label="Not in yet" value={rows.length - present} />
      </StatRow>

      <h2 className="pt-2 text-[22px] font-semibold tracking-[-0.3px] text-ink">Today</h2>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        rowHref={(r) => `/people/${r.id}`}
        mobile={(r) => ({
          title: r.name,
          subtitle: [roleLabels[r.role], r.record?.location].filter(Boolean).join(" · "),
          meta: <AttendanceChip record={r.record} />,
        })}
        columns={[
          { key: "name", header: "Name", cell: (r) => r.name },
          { key: "role", header: "Role", cell: (r) => roleLabels[r.role], className: "text-ink-secondary" },
          { key: "status", header: "Today", cell: (r) => <AttendanceChip record={r.record} /> },
          { key: "out", header: "Check-out", cell: (r) => r.record?.checkOut ?? "–", className: "text-ink-secondary" },
          { key: "where", header: "Where", cell: (r) => r.record?.location ?? "–", className: "hidden text-ink-secondary lg:table-cell" },
          {
            key: "fix",
            header: "",
            srHeader: "Correct",
            align: "right",
            cell: () => (
              <SampleActionButton variant="plain" message="Sample mode: the owner could correct this record; the reason is kept in the audit history.">
                Correct
              </SampleActionButton>
            ),
          },
        ]}
      />

      <h2 className="pt-2 text-[22px] font-semibold tracking-[-0.3px] text-ink">{formatMonth((await getToday()).slice(0, 7))} so far</h2>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        rowHref={(r) => `/people/${r.id}`}
        mobile={(r) => ({
          title: r.name,
          subtitle: `Absent ${r.month.absent} · half ${r.month.halfDay} · leave ${r.month.leave} · late ${r.month.late}`,
          value: `${r.month.present}/${r.month.workingDays}`,
        })}
        columns={[
          { key: "name", header: "Name", cell: (r) => r.name },
          { key: "present", header: "Present", align: "right", cell: (r) => `${r.month.present} / ${r.month.workingDays}` },
          { key: "half", header: "Half days", align: "right", cell: (r) => r.month.halfDay },
          { key: "leave", header: "Leave", align: "right", cell: (r) => r.month.leave },
          { key: "absent", header: "Absent", align: "right", cell: (r) => <span className={r.month.absent ? "text-danger" : undefined}>{r.month.absent}</span> },
          { key: "late", header: "Late", align: "right", cell: (r) => <span className={r.month.late ? "text-warning" : undefined}>{r.month.late}</span> },
        ]}
      />

      <h2 className="pt-2 text-[22px] font-semibold tracking-[-0.3px] text-ink">Day by day</h2>
      <DataTools title="Attendance" presets={recordDates} />
      <DataTable
        rows={records}
        rowKey={(r) => `${r.profileId}-${r.date}`}
        rowHref={(r) => `/people/${r.profileId}`}
        empty="No attendance for these dates."
        mobile={(r) => ({
          title: r.name,
          subtitle: [formatShortDate(r.date), r.checkOut && `out ${r.checkOut}`, r.location].filter(Boolean).join(" · "),
          meta: <AttendanceChip record={r} />,
        })}
        columns={[
          { key: "date", header: "Date", cell: (r) => formatDate(r.date), className: "whitespace-nowrap text-ink-secondary" },
          { key: "name", header: "Name", cell: (r) => r.name },
          { key: "status", header: "Status", cell: (r) => <AttendanceChip record={r} /> },
          { key: "in", header: "Check-in", cell: (r) => r.checkIn ?? "–", className: "text-ink-secondary" },
          { key: "out", header: "Check-out", cell: (r) => r.checkOut ?? "–", className: "text-ink-secondary" },
          { key: "where", header: "Where", cell: (r) => r.location ?? "–", className: "hidden text-ink-secondary lg:table-cell" },
        ]}
      />
      {corrected.length > 0 && (
        <p className="px-1 text-[13px] text-ink-secondary">
          Corrected records keep who changed them and why, e.g.{" "}
          <Link href={`/people/${corrected[0].profileId}`} className="text-link underline underline-offset-2">
            {corrected[0].name}, {formatShortDate(corrected[0].date)}
          </Link>
          : &ldquo;{corrected[0].correctionReason}&rdquo;.
        </p>
      )}
    </div>
  );
}

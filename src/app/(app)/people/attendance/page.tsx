import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AttendanceChip } from "@/components/people/attendance-chip";
import { ListSkeleton, SampleChip, StatCard, StatRow } from "@/components/ui/blocks";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { SampleActionButton } from "@/components/ui/sample-action";
import { getAttendanceCorrections, getAttendanceToday, getToday } from "@/lib/data";
import { formatDate, formatMonth, formatShortDate } from "@/lib/format";
import { roleLabels } from "@/lib/labels";
import { CheckInCard } from "./check-in-card";

export const metadata: Metadata = { title: "Attendance" };

export default function AttendancePage() {
  return (
    <>
      <PageHeader title="Attendance" subtitle={`Today, ${formatDate(getToday())}. Weekly off on Sundays.`} actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton />}>
        <AttendanceData />
      </Suspense>
    </>
  );
}

async function AttendanceData() {
  const rows = await getAttendanceToday();
  const present = rows.filter((r) => r.record?.status === "present" || r.record?.status === "half_day").length;
  const corrected = await getAttendanceCorrections();

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

      <h2 className="pt-2 text-[22px] font-semibold tracking-[-0.3px] text-ink">{formatMonth(getToday().slice(0, 7))} so far</h2>
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

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AttendanceChip } from "@/components/people/attendance-chip";
import { ListSkeleton, OriginChip, SampleTag, SectionCard, StatCard, StatRow } from "@/components/ui/blocks";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Today } from "@/components/ui/today";
import { getCurrentUser, getMyAttendance } from "@/lib/data";
import { formatDate, formatShortDate } from "@/lib/format";
import { CheckIn } from "./check-in";

export const metadata: Metadata = { title: "Attendance" };

/** Each staff member's own attendance: check in and out, and their own days. Nobody sees anyone else's here. */
export default function MyAttendancePage() {
  return (
    <div className="animate-fade-up">
      <PageHeader title="My attendance" subtitle={<><Today />. Only you see your attendance.</>} />
      <Suspense fallback={<ListSkeleton />}>
        <Mine />
      </Suspense>
    </div>
  );
}

async function Mine() {
  const user = await getCurrentUser();
  if (user.role === "owner") {
    return (
      <SectionCard>
        Everyone&apos;s attendance is under{" "}
        <Link href="/people/attendance" className="text-link hover:underline">
          People › Attendance
        </Link>
        .
      </SectionCard>
    );
  }
  const { today, month, records } = await getMyAttendance();
  return (
    <div className="space-y-4">
      <CheckIn checkIn={today?.checkIn} checkOut={today?.checkOut} />
      <StatRow>
        <StatCard label="Present this month" value={month.present} tone="good" />
        <StatCard label="Half days" value={month.halfDay} tone="warning" />
        <StatCard label="Leave or absent" value={month.leave + month.absent} />
        <StatCard label="Late" value={month.late} tone="warning" />
      </StatRow>
      <div className="flex items-center justify-between gap-3 pt-2">
        <h2 className="text-[22px] font-semibold tracking-[-0.3px] text-ink">Your days</h2>
        <OriginChip records={records} />
      </div>
      <DataTable
        rows={records.slice(0, 62)}
        rowKey={(r) => r.date}
        empty="No attendance yet. Check in to start."
        mobile={(r) => ({
          title: (
            <>
              {formatShortDate(r.date)}
              <SampleTag record={r} />
            </>
          ),
          subtitle: [r.checkIn && `In ${r.checkIn}`, r.checkOut && `out ${r.checkOut}`].filter(Boolean).join(" · ") || undefined,
          meta: <AttendanceChip record={r} />,
        })}
        columns={[
          {
            key: "date",
            header: "Date",
            cell: (r) => (
              <>
                {formatDate(r.date)}
                <SampleTag record={r} />
              </>
            ),
          },
          { key: "status", header: "Status", cell: (r) => <AttendanceChip record={r} /> },
          { key: "in", header: "Check-in", cell: (r) => r.checkIn ?? "–", className: "tabular-nums text-ink-secondary" },
          { key: "out", header: "Check-out", cell: (r) => r.checkOut ?? "–", className: "tabular-nums text-ink-secondary" },
        ]}
      />
    </div>
  );
}

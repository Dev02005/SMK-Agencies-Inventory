import { Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AttendanceChip, attendanceLabels } from "@/components/people/attendance-chip";
import { TargetBar } from "@/components/people/target-bar";
import { BackLink, DetailList, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { buttonClass } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { RoleGuard } from "@/components/ui/sub-nav";
import { cn } from "@/lib/cn";
import { getEmployee, getToday } from "@/lib/data";
import { formatBalance, formatDate, formatINR, formatMonth, formatShortDate } from "@/lib/format";
import { roleLabels } from "@/lib/labels";

export const metadata: Metadata = { title: "Employee" };

export default function EmployeePage({ params }: PageProps<"/people/[id]">) {
  return (
    <>
      <BackLink href="/people">People</BackLink>
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <Employee params={params} />
      </Suspense>
    </>
  );
}

async function Employee({ params }: { params: PageProps<"/people/[id]">["params"] }) {
  const { id } = await params;
  const e = await getEmployee(id);
  if (!e) notFound();
  const thisWeek = e.visits.filter((v) => v.date >= getToday()).slice(0, 8);
  const thisMonth = getToday().slice(0, 7);
  const slip = e.slips.find((s) => s.month === thisMonth);

  return (
    <>
      <PageHeader
        title={e.fullName}
        subtitle={`${e.designation} · ${roleLabels[e.role]} · joined ${formatDate(e.joinedOn)}`}
        actions={
          <>
            <SampleChip />
            <a href={`tel:+91${e.mobile}`} className={buttonClass("secondary")}>
              <Phone size={17} strokeWidth={1.75} aria-hidden /> Call
            </a>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Attendance" action={<AttendanceChip record={e.today} />}>
          <p className="text-[13px] text-ink-secondary">{formatMonth(getToday().slice(0, 7))}</p>
          <div className="mt-2 grid grid-cols-7 gap-1.5" aria-label="Attendance this month">
            {e.attendance
              .filter((a) => a.date.startsWith(getToday().slice(0, 7)))
              .map((a) => (
                <span
                  key={a.date}
                  title={`${formatShortDate(a.date)}: ${attendanceLabels[a.status].label}${a.checkIn ? ` ${a.checkIn}` : ""}`}
                  className={cn("grid aspect-square place-items-center rounded-lg text-[11px]", attendanceLabels[a.status].dot, a.status === "holiday" ? "text-ink-secondary" : "text-white")}
                >
                  {Number(a.date.slice(8, 10))}
                </span>
              ))}
          </div>
          <DetailList
            className="mt-3"
            items={[
              { label: "Present", value: `${e.month.present} of ${e.month.workingDays} days` },
              { label: "Half days", value: e.month.halfDay || undefined },
              { label: "Leave", value: e.month.leave || undefined },
              { label: "Absent", value: e.month.absent ? <span className="text-danger">{e.month.absent}</span> : undefined },
              { label: "Late arrivals", value: e.month.late ? <span className="text-warning">{e.month.late}</span> : undefined },
            ]}
          />
        </SectionCard>

        {e.target ? (
          <SectionCard title={`Targets · ${formatMonth(e.target.month)}`}>
            <div className="space-y-4">
              <TargetBar label="Sales" actual={e.target.salesActual} target={e.target.sales} elapsed={e.target.monthElapsed} />
              <TargetBar label="Collections" actual={e.target.collectionsActual} target={e.target.collections} elapsed={e.target.monthElapsed} />
            </div>
          </SectionCard>
        ) : (
          <SectionCard title="Work">
            <DetailList items={[{ label: "Area", value: e.areas.join(", ") }, { label: "Vehicle", value: e.vehicle }, { label: "Mobile", value: `+91 ${e.mobile}` }]} />
          </SectionCard>
        )}

        <RoleGuard roles={["owner", "office"]} fallback={<SectionCard title="Pay">Visible to the owner and office.</SectionCard>}>
          <SectionCard title="Pay and loans">
            <DetailList
              items={[
                { label: "Monthly salary", value: formatINR(e.monthlySalary) },
                { label: `${formatMonth(thisMonth)} net (to pay)`, value: slip && formatINR(slip.net) },
                { label: "Loan / advance balance", value: e.loanBalance ? <span className="text-warning">{formatINR(e.loanBalance)}</span> : "None" },
              ]}
            />
            <Link href="/people/salary" className="mt-2 inline-block text-[15px] text-link hover:underline">
              Salary sheet ›
            </Link>
          </SectionCard>
        </RoleGuard>
      </div>

      {e.parties.length > 0 && (
        <SectionCard
          title={`Parties (${e.parties.length})`}
          className="mt-4"
          action={
            <Link href="/people/mapping" className="text-[15px] text-link hover:underline">
              Change mapping ›
            </Link>
          }
        >
          <ul className="divide-y divide-hairline">
            {e.parties.map((p) => (
              <li key={p.id}>
                <Link href={`/parties/${p.id}`} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-ink">{p.name}</span>
                    <span className="block text-[12px] text-ink-secondary">{p.place}</span>
                  </span>
                  {p.overdue30 > 0 && <Chip tone="warning">Overdue</Chip>}
                  <span className="text-[15px] tabular-nums text-ink">{formatBalance(p.balance)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {thisWeek.length > 0 && (
        <SectionCard
          title="Tour plan"
          className="mt-4"
          action={
            <Link href="/people/tours" className="text-[15px] text-link hover:underline">
              All visits ›
            </Link>
          }
        >
          <ul className="divide-y divide-hairline">
            {thisWeek.map((v) => (
              <li key={v.id} className="flex items-center gap-3 py-2.5">
                <span className="w-16 shrink-0 text-[13px] text-ink-secondary">{formatShortDate(v.date)}</span>
                <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{v.partyName}</span>
                <Chip tone={v.status === "completed" ? "good" : v.status === "planned" ? "accent" : "warning"}>{v.status}</Chip>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </>
  );
}

import { ClipboardList, FileText, HandCoins, Route, Wallet } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AttendanceChip } from "@/components/people/attendance-chip";
import { TargetBar } from "@/components/people/target-bar";
import { ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";
import { getCurrentUser, getFieldHome } from "@/lib/data";
import { formatINR, formatShortDate } from "@/lib/format";
import { orderStatus } from "@/lib/labels";
import { TodayLine } from "./owner-home";

const actions = [
  { href: "/money/receipts/new", label: "Receipt", icon: Wallet, tone: "bg-good-soft text-good" },
  { href: "/orders/new", label: "Order", icon: ClipboardList, tone: "bg-accent-soft text-accent" },
  { href: "/quotations/new", label: "Quotation", icon: FileText, tone: "bg-accent-soft text-accent" },
  { href: "/money/cash/handover/new", label: "Hand over", icon: HandCoins, tone: "bg-good-soft text-good" },
];

/** Sales and collection staff: visits, who to collect from, cash in hand and target progress. */
export function FieldHome({ profileId }: { profileId: string }) {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Today"
        subtitle={
          <Suspense fallback={null}>
            <TodayLine />
          </Suspense>
        }
        actions={<SampleChip />}
      />
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <FieldDay profileId={profileId} />
      </Suspense>
    </div>
  );
}

async function FieldDay({ profileId }: { profileId: string }) {
  // Their own day when a field staff member is signed in; the owner previewing sees the first field staff member.
  const me = await getCurrentUser();
  const d = await getFieldHome(me.role === "field" ? me.id : profileId);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <SectionCard title={`Hello, ${d.name}`} action={<AttendanceChip record={d.attendance} />}>
        <p className="text-[13px] text-ink-secondary">Cash with you</p>
        <p className="text-[34px] font-semibold leading-[41px] tracking-[-0.4px] tabular-nums text-ink">{formatINR(d.cash?.closing ?? 0)}</p>
        <p className="text-[13px] text-ink-secondary">Collected today {formatINR(d.cash?.collections ?? 0)}</p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.href} href={a.href} className="flex flex-col items-center gap-1.5 rounded-2xl py-2 text-center text-[12px] text-ink hover:bg-card-subtle">
                <span className={cn("grid size-11 place-items-center rounded-full", a.tone)}>
                  <Icon size={20} strokeWidth={1.75} aria-hidden />
                </span>
                {a.label}
              </Link>
            );
          })}
        </div>
      </SectionCard>

      {d.target && (
        <SectionCard title="My targets this month">
          <div className="space-y-4">
            <TargetBar label="Sales" actual={d.target.salesActual} target={d.target.sales} elapsed={d.target.monthElapsed} />
            <TargetBar label="Collections" actual={d.target.collectionsActual} target={d.target.collections} elapsed={d.target.monthElapsed} />
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Today's visits"
        action={
          <Link href="/people/tours" className="text-[15px] text-link hover:underline">
            Plan ›
          </Link>
        }
      >
        {d.visits.length === 0 ? (
          <p className="py-2 text-[15px] text-ink-secondary">No visits planned today.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {d.visits.map((v) => (
              <li key={v.id} className="flex items-center gap-3 py-2.5">
                <Route size={18} strokeWidth={1.75} className="shrink-0 text-ink-tertiary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] text-ink">{v.partyName}</p>
                  <p className="text-[12px] text-ink-secondary">
                    {v.place}
                    {v.outcome && ` · ${v.outcome}`}
                  </p>
                </div>
                <Chip tone={v.status === "completed" ? "good" : v.status === "planned" ? "accent" : "warning"}>{v.status}</Chip>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Collect from" className="lg:col-span-2">
        <ul className="divide-y divide-hairline">
          {d.toCollect.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-3">
              <Link href={`/parties/${r.id}`} className="min-w-0 flex-1">
                <p className="truncate text-[15px] text-ink">{r.name}</p>
                <p className="text-[12px] text-ink-secondary">
                  {r.place} · {r.lastReminder ? `reminded ${formatShortDate(r.lastReminder.date)}` : "not reminded yet"}
                </p>
              </Link>
              <div className="text-right">
                <p className="text-[15px] font-medium tabular-nums text-ink">{formatINR(r.unpaid)}</p>
                {r.overdue > 0 && <p className="text-[12px] text-warning">{formatINR(r.overdue)} overdue</p>}
              </div>
            </li>
          ))}
        </ul>
        <ButtonLink href="/money/receipts/new" variant="secondary" className="mt-3 w-full">
          Record a collection
        </ButtonLink>
      </SectionCard>

      <SectionCard
        title="My open orders"
        action={
          <Link href="/orders" className="text-[15px] text-link hover:underline">
            All ›
          </Link>
        }
      >
        {d.orders.length === 0 ? (
          <p className="py-2 text-[15px] text-ink-secondary">No open orders.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {d.orders.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{o.partyName}</span>
                  <Chip tone={orderStatus[o.status].tone}>{orderStatus[o.status].label}</Chip>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

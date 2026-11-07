import { CircleAlert, IndianRupee, Wallet } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ListSkeleton, SampleChip, SectionCard, StatCard, StatRow } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { LiveTime } from "@/components/ui/live-clock";
import { ModuleGrid } from "@/components/ui/module-grid";
import { PageHeader } from "@/components/ui/page-header";
import { RoleGuard } from "@/components/ui/sub-nav";
import { getCurrentUser, getDashboard, getFirm, getLorries, getNow, getProducts, getToday } from "@/lib/data";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { toMT } from "@/lib/sales";
import { ActiveLorries } from "./active-lorries";

/** Owner and office: the whole business today. */
export function OwnerHome() {
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
        <Dashboard />
      </Suspense>
      <h2 className="mb-3 mt-8 text-[22px] font-semibold tracking-[-0.3px] text-ink">All modules</h2>
      <ModuleGrid />
    </div>
  );
}

const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: "UTC" });

/** "Sunday, 1 Nov 2026 · 10:42 am · firm". Rendered per request so it is always today; the time keeps ticking. */
export async function TodayLine() {
  const [firm, today, now] = await Promise.all([getFirm(), getToday(), getNow()]);
  return (
    <>
      {weekday.format(new Date(`${today}T00:00:00Z`))}, {formatDate(today)} · <LiveTime now={now} /> · {firm.name}
    </>
  );
}

async function Dashboard() {
  // Lorries are the owner's alone; getLorries gives nobody else any.
  const [d, lorries, products, user] = await Promise.all([getDashboard(), getLorries(), getProducts(), getCurrentUser()]);
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <section className="surface p-5 md:col-span-2 md:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent shadow-xs">
            <IndianRupee size={17} strokeWidth={2.2} aria-hidden />
          </span>
          <h2 className="text-[15px] text-ink-secondary">Today&apos;s sales</h2>
          <Link href="/sales/new" className="ml-auto text-[15px] text-link hover:underline">
            New sale ›
          </Link>
        </div>
        <p className="mt-4 text-[40px] font-semibold leading-[44px] tracking-[-0.5px] tabular-nums text-ink">
          {formatINR(d.sales.amount)}
        </p>
        <p className="mt-2 text-[15px] text-ink-secondary">
          {formatNumber(d.sales.cementBags)} bags cement ({formatNumber(toMT(d.sales.cementBags, "bag"))} MT) ·{" "}
          {formatNumber(d.sales.steelMT)} MT steel · {d.sales.bills} bills
        </p>
      </section>

      <SectionCard title="Cash with staff" icon={Wallet} iconTone="good">
        <ul className="divide-y divide-hairline">
          {d.cashWithStaff.map((person) => (
            <li key={person.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] text-ink">{person.name}</p>
                <Chip tone={person.handedOver ? "good" : "warning"} className="mt-1">
                  {person.handedOver ? "Handed over" : "With staff"}
                </Chip>
              </div>
              <span className="text-[15px] font-medium tabular-nums text-ink">{formatINR(person.amount)}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      {user.role === "owner" && (
        <RoleGuard roles={["owner"]} fallback={<></>}>
          <ActiveLorries lorries={lorries} products={products} className="md:col-span-3" />
        </RoleGuard>
      )}

      <StatRow className="md:col-span-3">
        <StatCard label="Collected today" value={formatINR(d.collected)} />
        <StatCard label="Outstanding" value={formatINR(d.outstanding)} />
        <StatCard label="Overdue 30+ days" value={formatINR(d.overdue30)} tone="danger" />
      </StatRow>

      <SectionCard
        title="Needs your approval"
        icon={CircleAlert}
        iconTone="danger"
        action={<Chip tone={d.approvals.length ? "danger" : "neutral"}>{d.approvals.length}</Chip>}
        className="md:col-span-3 lg:col-span-2"
      >
        {d.approvals.length === 0 ? (
          <p className="py-3 text-[15px] text-ink-secondary">Nothing waiting.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {d.approvals.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] text-ink">{item.title}</p>
                    <p className="text-[13px] text-danger">{item.detail}</p>
                  </div>
                  <span className="text-[15px] text-link">Review ›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Due this week" className="md:col-span-3 lg:col-span-1">
        {d.upcoming.length === 0 ? (
          <p className="py-3 text-[15px] text-ink-secondary">Nothing due this week.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {d.upcoming.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="flex items-center gap-3 py-3">
                  <span className="flex-1 text-[15px] text-ink">{item.title}</span>
                  <Chip tone={item.when === "overdue" ? "danger" : "warning"}>{item.when}</Chip>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

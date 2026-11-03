import { MapPin } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AttendanceChip } from "@/components/people/attendance-chip";
import { ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { SampleActionButton } from "@/components/ui/sample-action";
import { getCurrentUser, getDriverHome, getProducts } from "@/lib/data";
import { formatDate, formatINR } from "@/lib/format";
import { describeQuantities } from "@/lib/quantities";
import { TodayLine } from "./owner-home";

const deliveryStatus = {
  loaded: { label: "Loaded", tone: "neutral" },
  on_the_way: { label: "On the way", tone: "accent" },
  delivered: { label: "Delivered", tone: "good" },
} as const;

/** Driver: today's deliveries in order, cash in hand and the vehicle's renewals. */
export function DriverHome({ profileId }: { profileId: string }) {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Today's trips"
        subtitle={
          <Suspense fallback={null}>
            <TodayLine />
          </Suspense>
        }
        actions={<SampleChip />}
      />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <DriverDay profileId={profileId} />
      </Suspense>
    </div>
  );
}

async function DriverDay({ profileId }: { profileId: string }) {
  // Their own deliveries when a driver is signed in; the owner previewing sees the first driver.
  const me = await getCurrentUser();
  const [d, products] = await Promise.all([getDriverHome(me.role === "driver" ? me.id : profileId), getProducts()]);
  const next = d.deliveries.find((x) => x.status !== "delivered");

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {d.deliveries.length === 0 && <SectionCard>No deliveries today.</SectionCard>}
        {d.deliveries.map((x, i) => {
          const status = deliveryStatus[x.status];
          return (
            <section key={x.id} className={`surface p-5 ${x.id === next?.id ? "ring-2 ring-accent" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] text-ink-secondary">
                    Stop {i + 1} · Bill {x.billNo}
                    {x.time && ` · ${x.time}`}
                  </p>
                  <p className="truncate text-[20px] font-semibold tracking-[-0.3px] text-ink">{x.partyName}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[15px] text-ink-secondary">
                    <MapPin size={15} strokeWidth={1.75} aria-hidden /> {x.destination}
                  </p>
                </div>
                <Chip tone={status.tone}>{status.label}</Chip>
              </div>
              <p className="mt-3 text-[15px] text-ink">{describeQuantities(x.lines, products)}</p>
              {x.status !== "delivered" && (
                <div className="mt-4 flex gap-2">
                  <SampleActionButton
                    variant="primary"
                    className="flex-1"
                    message={x.status === "loaded" ? "Sample mode: the trip would be marked as started." : "Sample mode: delivery time would be saved and the office told."}
                  >
                    {x.status === "loaded" ? "Start trip" : "Mark delivered"}
                  </SampleActionButton>
                  <SampleActionButton variant="secondary" message="Sample mode: short or damaged bags would be recorded against this bill.">
                    Report shortage
                  </SampleActionButton>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="space-y-4">
        <SectionCard title={d.vehicle ?? "Vehicle"} action={<AttendanceChip record={d.attendance} />}>
          <p className="text-[13px] text-ink-secondary">Cash with you</p>
          <p className="text-[28px] font-semibold tabular-nums tracking-[-0.4px] text-ink">{formatINR(d.cash?.closing ?? 0)}</p>
          <p className="text-[13px] text-ink-secondary">Diesel today {formatINR(d.fuelToday)}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ButtonLink href="/money/expenses/new" variant="secondary">
              Add expense
            </ButtonLink>
            <ButtonLink href="/money/cash/handover/new" variant="secondary">
              Hand over
            </ButtonLink>
          </div>
        </SectionCard>
        {d.renewals.length > 0 && (
          <SectionCard title="Renewals due">
            <ul className="divide-y divide-hairline">
              {d.renewals.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-[15px] text-ink">
                    {p.title} insurance
                    <span className="block text-[12px] text-ink-secondary">{formatDate(p.nextDue)}</span>
                  </span>
                  <Chip tone={p.daysLeft <= 7 ? "warning" : "neutral"}>in {p.daysLeft} days</Chip>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] text-ink-tertiary">The office handles the renewal; keep the papers in the vehicle.</p>
          </SectionCard>
        )}
        <Link href="/people/attendance" className="block text-center text-[15px] text-link hover:underline">
          Check in / check out ›
        </Link>
      </div>
    </div>
  );
}

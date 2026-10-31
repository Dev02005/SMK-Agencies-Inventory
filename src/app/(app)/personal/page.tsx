import { Pin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListSkeleton, SampleChip, SectionCard, StatCard, StatRow } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { getBankAccounts, getChits, getNotes, getPolicies, getRentals, getToday } from "@/lib/data";
import { formatDate, formatINR, formatShortDate } from "@/lib/format";
import { isPersonalUnlocked } from "@/lib/personal-lock";
import { PersonalSection } from "./personal-section";

export const metadata: Metadata = { title: "Personal" };

export default function PersonalPage() {
  return (
    <PersonalSection>
      <PersonalContent />
    </PersonalSection>
  );
}

function PersonalContent() {
  return (
    <>
      <PageHeader title="Personal" subtitle="Only you can see this" actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Overview />
      </Suspense>
    </>
  );
}

const days = (n: number) => (n < 0 ? `${-n} days late` : n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`);

async function Overview() {
  // Checked here, next to the data: the layout alone cannot stop a page from rendering.
  if (!(await isPersonalUnlocked())) return null;
  const [banks, chits, rentals, policies, notes, today] = await Promise.all([getBankAccounts("personal"), getChits(), getRentals(), getPolicies(), getNotes(), getToday()]);
  const nextChit = chits.filter((c) => c.nextDue).sort((a, b) => a.daysToDue - b.daysToDue)[0];
  const rentDue = rentals.filter((r) => r.direction === "received" && r.status !== "paid");

  const coming = [
    ...policies.filter((p) => p.daysLeft <= 60).map((p) => ({ key: p.id, title: `${p.title} premium`, detail: `${p.insurer} · ${formatINR(p.premium)}`, days: p.daysLeft, href: "/personal/insurance" })),
    ...chits.filter((c) => c.nextDue && c.daysToDue <= 30).map((c) => ({ key: c.id, title: `Chit instalment · ${c.organiser}`, detail: formatINR(c.instalment), days: c.daysToDue, href: "/personal/chits" })),
    ...rentals
      .filter((r) => r.status !== "paid")
      .map((r) => ({ key: r.id, title: `Rent ${r.direction === "received" ? "from" : "to"} ${r.counterparty}`, detail: formatINR(r.amountDue), days: r.status === "overdue" ? -1 : 0, href: "/personal/rents" })),
    ...notes
      .filter((n) => n.remindOn && n.remindOn >= today)
      .map((n) => ({ key: n.id, title: n.title, detail: `Reminder ${formatShortDate(n.remindOn!)}`, days: Math.round((Date.parse(n.remindOn!) - Date.parse(today)) / 86_400_000), href: "/personal/notes" })),
  ].sort((a, b) => a.days - b.days);

  return (
    <div className="space-y-4">
      <StatRow>
        <StatCard label="Personal bank" value={formatINR(banks.reduce((s, b) => s + b.balance, 0))} />
        <StatCard label="Next chit" value={nextChit ? formatINR(nextChit.instalment) : "–"} hint={nextChit?.nextDue && `due ${formatShortDate(nextChit.nextDue)}`} />
        <StatCard label="Rent to collect" value={formatINR(rentDue.reduce((s, r) => s + r.amountDue, 0))} tone={rentDue.some((r) => r.status === "overdue") ? "danger" : undefined} hint={`${rentDue.length} tenant${rentDue.length === 1 ? "" : "s"}`} />
      </StatRow>

      <div className="grid gap-4 lg:grid-cols-5">
        <SectionCard title="Coming up" className="lg:col-span-3">
          <ul className="divide-y divide-hairline">
            {coming.map((c) => (
              <li key={c.key}>
                <Link href={c.href} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] text-ink">{c.title}</p>
                    <p className="text-[13px] text-ink-secondary">{c.detail}</p>
                  </div>
                  <Chip tone={c.days < 0 ? "danger" : c.days <= 7 ? "warning" : "neutral"}>{c.days < 0 ? "overdue" : days(c.days)}</Chip>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Pinned notes" className="lg:col-span-2" action={<Link href="/personal/notes" className="text-[15px] text-link hover:underline">All notes ›</Link>}>
          <ul className="space-y-3">
            {notes
              .filter((n) => n.pinned)
              .map((n) => (
                <li key={n.id} className="rounded-2xl bg-warning-soft/60 p-3">
                  <p className="flex items-center gap-1.5 text-[15px] font-medium text-ink">
                    <Pin size={14} strokeWidth={2} className="text-warning" aria-hidden /> {n.title}
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink-secondary">{n.body}</p>
                  {n.remindOn && <p className="mt-1 text-[12px] text-ink-tertiary">Remind {formatDate(n.remindOn)}</p>}
                </li>
              ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

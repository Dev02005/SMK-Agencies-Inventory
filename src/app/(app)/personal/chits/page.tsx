import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailList, ListSkeleton, OriginChip, SampleTag, SectionCard } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { getChits, getToday } from "@/lib/data";
import { formatDate, formatINR } from "@/lib/format";
import { isPersonalUnlocked } from "@/lib/personal-lock";
import { PersonalSection } from "../personal-section";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { removeChit } from "../records-actions";
import { AddChit, RecordInstalment, RecordLifted } from "./chit-forms";

export const metadata: Metadata = { title: "Chits" };

export default function ChitsPage() {
  return (
    <PersonalSection>
      <ChitsContent />
    </PersonalSection>
  );
}

function ChitsContent() {
  return (
    <>
      <PageHeader title="Chit funds" subtitle="Each chit with its instalments, what's paid and what's left" />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <ChitList />
      </Suspense>
    </>
  );
}

/** "today", "in 3 days" or "4 days late" next to an instalment due soon. */
function DueChip({ days }: { days: number }) {
  if (days > 7) return null;
  if (days < 0) return <Chip tone="danger">{-days === 1 ? "1 day late" : `${-days} days late`}</Chip>;
  return <Chip tone="warning">{days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}</Chip>;
}

async function ChitList() {
  // Checked here, next to the data: the layout alone cannot stop a page from rendering.
  if (!(await isPersonalUnlocked())) return null;
  const [chits, today] = await Promise.all([getChits(), getToday()]);
  return (
    <>
      <AddChit tag={<OriginChip records={chits} />} today={today} />
      {chits.length === 0 && <SectionCard>No chits yet. Add one with Add chit.</SectionCard>}
      <div className="grid gap-4 lg:grid-cols-2">
        {chits.map((c) => {
          const last = c.payments?.at(-1);
          return (
            <SectionCard
              key={c.id}
              title={
                <>
                  {c.organiser}
                  <SampleTag record={c} />
                </>
              }
              action={<Chip tone={c.scope === "business" ? "accent" : "neutral"}>{c.scope === "business" ? "Business" : "Personal"}</Chip>}
            >
              <p className="-mt-2 mb-3 text-[13px] text-ink-secondary">
                {c.chitNo ? `Chit ${c.chitNo} · ` : ""}
                {formatINR(c.totalValue)} over {c.months} months
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-hairline" role="img" aria-label={`${c.paidMonths} of ${c.months} instalments paid`}>
                <div className="h-full bg-purple" style={{ width: `${(c.paidMonths / c.months) * 100}%` }} />
              </div>
              <p className="mt-2 text-[13px] text-ink-secondary">
                {c.paidMonths} of {c.months} instalments paid · {c.remainingMonths} left
              </p>
              <DetailList
                className="mt-3"
                items={[
                  { label: "Instalment", value: formatINR(c.instalment) },
                  { label: "Paid so far", value: formatINR(c.paid) },
                  { label: "Last paid", value: last && `${formatINR(last.amount)} on ${formatDate(last.date)}` },
                  {
                    label: "Next due",
                    value: c.nextDue ? (
                      <span className="flex items-center justify-end gap-2">
                        {formatDate(c.nextDue)}
                        <DueChip days={c.daysToDue} />
                      </span>
                    ) : (
                      "All paid"
                    ),
                  },
                  { label: "Lifted", value: c.lifted ? `Month ${c.lifted.month} · ${formatINR(c.lifted.amount)} on ${formatDate(c.lifted.date)}` : "Not yet" },
                ]}
              />
              {c.original ? (
                <>
                  {c.remainingMonths > 0 && <RecordInstalment key={c.paidMonths} id={c.id} month={c.paidMonths + 1} months={c.months} instalment={c.instalment} today={today} />}
                  {/* Keyed by instalments paid, so its month starts afresh after one is recorded. */}
                  {!c.lifted && <RecordLifted key={c.paidMonths} id={c.id} months={c.months} paidMonths={c.paidMonths} today={today} />}
                  <ConfirmDelete what={`${c.organiser} chit`} onDelete={removeChit.bind(null, c.id)} className="mt-3" />
                </>
              ) : (
                <p className="mt-3 text-[13px] text-ink-secondary">Sample chit: only chits you add can be recorded.</p>
              )}
            </SectionCard>
          );
        })}
      </div>
    </>
  );
}

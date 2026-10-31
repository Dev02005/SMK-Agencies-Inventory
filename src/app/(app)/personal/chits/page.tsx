import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailList, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { SampleActionButton } from "@/components/ui/sample-action";
import { getChits } from "@/lib/data";
import { formatDate, formatINR } from "@/lib/format";
import { isPersonalUnlocked } from "@/lib/personal-lock";
import { PersonalSection } from "../personal-section";

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
      <PageHeader
        title="Chit funds"
        subtitle="Each chit with its instalments, what's paid and what's left"
        actions={
          <>
            <SampleChip />
            <SampleActionButton variant="primary" message="Sample mode: a new chit would be added with its instalment schedule.">
              Add chit
            </SampleActionButton>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <ChitList />
      </Suspense>
    </>
  );
}

async function ChitList() {
  // Checked here, next to the data: the layout alone cannot stop a page from rendering.
  if (!(await isPersonalUnlocked())) return null;
  const chits = await getChits();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {chits.map((c) => (
        <SectionCard
          key={c.id}
          title={c.organiser}
          action={<Chip tone={c.scope === "business" ? "accent" : "neutral"}>{c.scope === "business" ? "Business" : "Personal"}</Chip>}
        >
          <p className="-mt-2 mb-3 text-[13px] text-ink-secondary">
            Chit {c.chitNo} · {formatINR(c.totalValue)} over {c.months} months
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
              {
                label: "Next due",
                value: c.nextDue && (
                  <span className="flex items-center justify-end gap-2">
                    {formatDate(c.nextDue)}
                    {c.daysToDue <= 7 && <Chip tone="warning">{c.daysToDue <= 0 ? "today" : `in ${c.daysToDue} days`}</Chip>}
                  </span>
                ),
              },
              { label: "Lifted", value: c.lifted ? `Month ${c.lifted.month} · ${formatINR(c.lifted.amount)} on ${formatDate(c.lifted.date)}` : "Not yet" },
            ]}
          />
          <SampleActionButton className="mt-4 w-full" message="Sample mode: the instalment would be recorded and the next due date moved on a month.">
            Record instalment
          </SampleActionButton>
        </SectionCard>
      ))}
    </div>
  );
}

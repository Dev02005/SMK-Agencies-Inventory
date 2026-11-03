import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailList, ListSkeleton, OriginChip, SampleTag, SectionCard } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { getRentals, getToday } from "@/lib/data";
import { formatDate, formatINR, formatMonth, shiftMonth } from "@/lib/format";
import { isPersonalUnlocked } from "@/lib/personal-lock";
import { PersonalSection } from "../personal-section";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { removeRent } from "../records-actions";
import { AddRent, RecordRent } from "./rent-forms";

export const metadata: Metadata = { title: "Rents" };

const statusChip = {
  paid: { tone: "good", label: "Paid" },
  due: { tone: "warning", label: "Due" },
  overdue: { tone: "danger", label: "Overdue" },
} as const;

export default function RentsPage() {
  return (
    <PersonalSection>
      <RentsContent />
    </PersonalSection>
  );
}

function RentsContent() {
  return (
    <>
      <PageHeader title="Rents" subtitle="Rent you receive from tenants and rent you pay" />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <RentList />
      </Suspense>
    </>
  );
}

async function RentList() {
  // Checked here, next to the data: the layout alone cannot stop a page from rendering.
  if (!(await isPersonalUnlocked())) return null;
  const [rentals, today] = await Promise.all([getRentals(), getToday()]);
  const groups = [
    { title: "Rent received", items: rentals.filter((r) => r.direction === "received") },
    { title: "Rent paid", items: rentals.filter((r) => r.direction === "paid") },
  ];
  return (
    <>
      <AddRent tag={<OriginChip records={rentals} />} today={today} />
      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="mb-3 text-[22px] font-semibold tracking-[-0.3px] text-ink">{g.title}</h2>
            {g.items.length === 0 && <SectionCard>None yet. Add one with Add rent.</SectionCard>}
            <div className="grid gap-4 lg:grid-cols-2">
              {g.items.map((r) => {
                const chip = statusChip[r.status];
                const last = r.payments?.at(-1);
                return (
                  <SectionCard
                    key={r.id}
                    title={
                      <>
                        {r.property}
                        <SampleTag record={r} />
                      </>
                    }
                    action={<Chip tone={chip.tone}>{chip.label}</Chip>}
                  >
                    <p className="-mt-2 mb-2 text-[13px] text-ink-secondary">
                      {r.direction === "received" ? "Tenant" : "Owner"}: {r.counterparty}
                      {r.phone && ` · +91 ${r.phone}`} · {r.scope === "business" ? "Business" : "Personal"}
                    </p>
                    <DetailList
                      items={[
                        { label: "Monthly rent", value: formatINR(r.monthlyRent) },
                        { label: "Due on", value: `${r.dueDay} of every month` },
                        { label: "Paid through", value: formatMonth(r.paidThrough) },
                        { label: "Last recorded", value: last && `${formatMonth(last.month)} · ${formatINR(last.amount)} on ${formatDate(last.date)}` },
                        { label: "Amount due now", value: r.amountDue ? <span className="font-semibold text-danger">{formatINR(r.amountDue)}</span> : undefined },
                        { label: "Advance held", value: formatINR(r.advance) },
                        { label: "Agreement ends", value: formatDate(r.agreementEnd) },
                      ]}
                    />
                    {r.status !== "paid" &&
                      (r.original ? (
                        <RecordRent id={r.id} direction={r.direction} month={shiftMonth(r.paidThrough, 1)} monthlyRent={r.monthlyRent} today={today} />
                      ) : (
                        <p className="mt-3 text-[13px] text-ink-secondary">Sample rent: only rents you add can be recorded.</p>
                      ))}
                    {r.original && <ConfirmDelete what={r.property} onDelete={removeRent.bind(null, r.id)} className="mt-3" />}
                  </SectionCard>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

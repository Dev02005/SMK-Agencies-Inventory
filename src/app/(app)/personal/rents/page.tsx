import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailList, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { SampleActionButton } from "@/components/ui/sample-action";
import { getRentals } from "@/lib/data";
import { formatDate, formatINR, formatMonth } from "@/lib/format";
import { isPersonalUnlocked } from "@/lib/personal-lock";
import { PersonalSection } from "../personal-section";

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
      <PageHeader title="Rents" subtitle="Rent you receive from tenants and rent you pay" actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <RentList />
      </Suspense>
    </>
  );
}

async function RentList() {
  // Checked here, next to the data: the layout alone cannot stop a page from rendering.
  if (!(await isPersonalUnlocked())) return null;
  const rentals = await getRentals();
  const groups = [
    { title: "Rent received", items: rentals.filter((r) => r.direction === "received") },
    { title: "Rent paid", items: rentals.filter((r) => r.direction === "paid") },
  ];
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.title}>
          <h2 className="mb-3 text-[22px] font-semibold tracking-[-0.3px] text-ink">{g.title}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {g.items.map((r) => {
              const chip = statusChip[r.status];
              return (
                <SectionCard key={r.id} title={r.property} action={<Chip tone={chip.tone}>{chip.label}</Chip>}>
                  <p className="-mt-2 mb-2 text-[13px] text-ink-secondary">
                    {r.direction === "received" ? "Tenant" : "Owner"}: {r.counterparty} · {r.scope === "business" ? "Business" : "Personal"}
                  </p>
                  <DetailList
                    items={[
                      { label: "Monthly rent", value: formatINR(r.monthlyRent) },
                      { label: "Due on", value: `${r.dueDay} of every month` },
                      { label: "Paid through", value: formatMonth(r.paidThrough) },
                      { label: "Amount due now", value: r.amountDue ? <span className="font-semibold text-danger">{formatINR(r.amountDue)}</span> : undefined },
                      { label: "Advance held", value: formatINR(r.advance) },
                      { label: "Agreement ends", value: formatDate(r.agreementEnd) },
                    ]}
                  />
                  {r.status !== "paid" && (
                    <SampleActionButton
                      variant="primary"
                      className="mt-4 w-full"
                      message={`Sample mode: ${formatINR(r.amountDue)} would be recorded as rent ${r.direction === "received" ? "received" : "paid"}.`}
                    >
                      {r.direction === "received" ? "Mark rent received" : "Mark rent paid"}
                    </SampleActionButton>
                  )}
                </SectionCard>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

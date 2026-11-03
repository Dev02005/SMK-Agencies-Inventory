import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SimpleForm } from "@/components/forms/simple-form";
import { TargetBar } from "@/components/people/target-bar";
import { ListSkeleton, SampleChip, SectionCard, StatCard, StatRow } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { Today } from "@/components/ui/today";
import { RoleGuard } from "@/components/ui/sub-nav";
import { getEmployees, getTargets, getToday } from "@/lib/data";
import { formatINR, formatMonth, formatNumber, shiftMonth } from "@/lib/format";
import { OwnerPage } from "@/components/auth/owner-only";

export const metadata: Metadata = { title: "Targets" };

function TargetsPageContent() {
  return (
    <>
      <PageHeader
        title={<>Targets · <Today as="month" fallback="this month" /></>}
        subtitle="Sales and collections for each staff member's parties. The thin line marks how much of the month has gone."
        actions={<SampleChip />}
      />
      <Suspense fallback={<ListSkeleton />}>
        <Targets />
      </Suspense>
    </>
  );
}

async function Targets() {
  const [targets, staff, today] = await Promise.all([getTargets(), getEmployees(), getToday()]);
  const thisMonth = today.slice(0, 7);
  const sum = (key: "sales" | "salesActual" | "collections" | "collectionsActual") => targets.reduce((s, t) => s + t[key], 0);

  return (
    <div className="space-y-4">
      <StatRow>
        <StatCard label="Sales vs target" value={`${Math.round((sum("salesActual") / sum("sales")) * 100)}%`} hint={`${formatINR(sum("salesActual"))} of ${formatINR(sum("sales"))}`} />
        <StatCard label="Collections vs target" value={`${Math.round((sum("collectionsActual") / sum("collections")) * 100)}%`} hint={`${formatINR(sum("collectionsActual"))} of ${formatINR(sum("collections"))}`} />
        <StatCard label="Month gone" value={`${Math.round((targets[0]?.monthElapsed ?? 0) * 100)}%`} />
      </StatRow>

      <div className="grid gap-4 md:grid-cols-2">
        {targets.map((t) => (
          <SectionCard
            key={t.profileId}
            title={
              <Link href={`/people/${t.profileId}`} className="hover:text-link">
                {t.name}
              </Link>
            }
            action={<span className="text-[13px] text-ink-secondary">{formatNumber(t.bagsActual)} bags sold</span>}
          >
            <div className="space-y-4">
              <TargetBar label="Sales" actual={t.salesActual} target={t.sales} elapsed={t.monthElapsed} />
              <TargetBar label="Collections" actual={t.collectionsActual} target={t.collections} elapsed={t.monthElapsed} />
            </div>
          </SectionCard>
        ))}
      </div>

      <RoleGuard roles={["owner", "office"]} fallback={null}>
        <SectionCard title="Set next month's target">
          <SimpleForm
            thing="target"
            submitLabel="Save target"
            fields={[
              { name: "staff", label: "Staff member", type: "select", options: staff.filter((s) => s.role === "field").map((s) => ({ value: s.id, label: s.fullName })) },
              { name: "month", label: "Month", type: "select", options: [1, 2].map((n) => shiftMonth(thisMonth, n)).map((m) => ({ value: m, label: formatMonth(m) })) },
              { name: "sales", label: "Sales target", type: "number", prefix: "₹", required: true },
              { name: "collections", label: "Collections target", type: "number", prefix: "₹", required: true },
            ]}
          />
        </SectionCard>
      </RoleGuard>
    </div>
  );
}

export default function TargetsPage() {
  return (
    <OwnerPage what="people records">
      <TargetsPageContent />
    </OwnerPage>
  );
}

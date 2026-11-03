import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BackLink, ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getBankAccounts, getCashSummary, getMyGodowns, getProfiles, getVehicleNames } from "@/lib/data";
import { formatINR, todayISO } from "@/lib/format";
import { ExpenseForm } from "./expense-form";

export const metadata: Metadata = { title: "New expense" };

export default function NewExpensePage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[640px]">
      <PageHeader back={<BackLink href="/money/expenses">Expenses</BackLink>} title="New expense" actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <FormForToday />
      </Suspense>
    </div>
  );
}

async function FormForToday() {
  await connection();
  const [holders, banks, godowns, profiles, vehicles] = await Promise.all([getCashSummary(), getBankAccounts(), getMyGodowns(), getProfiles(), getVehicleNames()]);
  return (
    <ExpenseForm
      today={todayISO()}
      paidFrom={[
        ...holders.map((h) => ({ value: `cash:${h.holder}`, label: `Cash · ${h.name} (has ${formatINR(h.closing)})` })),
        ...banks.map((b) => ({ value: b.id, label: b.name })),
      ]}
      tags={{
        vehicle: vehicles,
        employee: profiles.filter((p) => p.role !== "owner").map((p) => p.fullName),
        godown: godowns.map((g) => g.name),
      }}
    />
  );
}

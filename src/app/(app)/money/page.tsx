import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getPayments, getProfiles, getReceipts, getToday } from "@/lib/data";
import { MoneyLists } from "./money-lists";

export const metadata: Metadata = { title: "Receipts & payments" };

export default function MoneyPage() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Receipts & payments"
        subtitle="Money received from parties and paid to companies"
        actions={
          <>
            <SampleChip />
            <ButtonLink href="/money/payments/new" variant="secondary">
              New payment
            </ButtonLink>
            <ButtonLink href="/money/receipts/new">New receipt</ButtonLink>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <MoneyData />
      </Suspense>
    </div>
  );
}

async function MoneyData() {
  const [receipts, payments, profiles] = await Promise.all([getReceipts(), getPayments(), getProfiles()]);
  const staff = Object.fromEntries(profiles.map((p) => [p.id, p.fullName]));
  const fieldStaff = profiles.filter((p) => p.role === "field").map((p) => p.id);
  return <MoneyLists receipts={receipts} payments={payments} staff={staff} fieldStaff={fieldStaff} month={getToday().slice(0, 7)} />;
}

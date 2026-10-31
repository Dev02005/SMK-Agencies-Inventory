import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BackLink, ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getParties } from "@/lib/data";
import { todayISO } from "@/lib/format";
import { PaymentForm } from "../../payment-form";

export const metadata: Metadata = { title: "New payment" };

export default function NewPaymentPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[640px]">
      <PageHeader back={<BackLink href="/money">Receipts & payments</BackLink>} title="New payment" actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <FormForToday />
      </Suspense>
    </div>
  );
}

async function FormForToday() {
  await connection();
  const parties = await getParties();
  return (
    <PaymentForm
      kind="payment"
      parties={parties
        .filter((p) => p.kind === "company" || p.kind === "lorry_owner")
        .map((p) => ({ id: p.id, name: p.name, place: p.place, balance: p.balance }))}
      staff={[]}
      today={todayISO()}
    />
  );
}

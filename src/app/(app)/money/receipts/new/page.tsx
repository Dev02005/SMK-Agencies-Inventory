import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BackLink, ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getParties, getProfiles } from "@/lib/data";
import { todayISO } from "@/lib/format";
import { PaymentForm } from "../../payment-form";

export const metadata: Metadata = { title: "New receipt" };

export default function NewReceiptPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[640px]">
      <PageHeader back={<BackLink href="/money">Receipts & payments</BackLink>} title="New receipt" actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <FormForToday />
      </Suspense>
    </div>
  );
}

async function FormForToday() {
  await connection();
  const [parties, profiles] = await Promise.all([getParties(), getProfiles()]);
  return (
    <PaymentForm
      kind="receipt"
      parties={parties
        .filter((p) => p.kind === "customer" || p.kind === "sub_dealer")
        .map((p) => ({ id: p.id, name: p.name, place: p.place, balance: p.balance, mobile: p.mobile }))}
      staff={profiles.filter((p) => p.role !== "driver").map((p) => ({ id: p.id, name: p.fullName }))}
      today={todayISO()}
    />
  );
}

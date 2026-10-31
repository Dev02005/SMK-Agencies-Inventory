import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AddBankForm } from "@/components/money/add-bank-form";
import { BackLink, ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getFirm } from "@/lib/data";

export const metadata: Metadata = { title: "Add bank" };

export default function AddBankPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[680px]">
      <PageHeader
        back={<BackLink href="/money/banks">Banks</BackLink>}
        title="Add bank"
        subtitle="A business bank account. You can then add entries to it or import its statement."
        actions={<SampleChip />}
      />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <AddBankData />
      </Suspense>
    </div>
  );
}

async function AddBankData() {
  // The form starts on today's date, so it is made per visit rather than built ahead.
  await connection();
  const firm = await getFirm();
  return <AddBankForm holder={firm.name} />;
}

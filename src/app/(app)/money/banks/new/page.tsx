import type { Metadata } from "next";
import { Suspense } from "react";
import { BankEntryForm } from "@/components/money/bank-entry-form";
import { BackLink, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getBankAccounts } from "@/lib/data";

export const metadata: Metadata = { title: "New bank entry" };

export default function NewBankEntryPage({ searchParams }: PageProps<"/money/banks/new">) {
  return (
    <div className="animate-fade-up mx-auto max-w-[640px]">
      <PageHeader
        back={<BackLink href="/money/banks">Banks</BackLink>}
        title="New bank entry"
        subtitle="For money that isn't a receipt, payment or expense: deposits, withdrawals, transfers, charges, interest"
        actions={<SampleChip />}
      />
      <Suspense fallback={<ListSkeleton rows={5} />}>
        <EntryForm searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function EntryForm({ searchParams }: { searchParams: PageProps<"/money/banks/new">["searchParams"] }) {
  const [{ account }, business] = await Promise.all([searchParams, getBankAccounts("business")]);
  return (
    <SectionCard>
      <BankEntryForm accounts={business.map((a) => ({ id: a.id, name: a.name }))} defaultAccountId={typeof account === "string" ? account : undefined} />
    </SectionCard>
  );
}

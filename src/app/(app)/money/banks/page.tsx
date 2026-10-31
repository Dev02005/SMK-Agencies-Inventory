import type { Metadata } from "next";
import { Suspense } from "react";
import { BankList } from "@/components/money/bank-list";
import { ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getBankAccounts } from "@/lib/data";

export const metadata: Metadata = { title: "Banks" };

export default function BanksPage() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Banks"
        subtitle="Business bank accounts. Payments and receipts by UPI, NEFT and cheque land here automatically."
        actions={
          <>
            <SampleChip />
            <ButtonLink href="/money/banks/new" variant="secondary">
              New bank entry
            </ButtonLink>
            <ButtonLink href="/money/banks/add">Add bank</ButtonLink>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <Accounts />
      </Suspense>
    </div>
  );
}

async function Accounts() {
  return <BankList accounts={await getBankAccounts("business")} />;
}

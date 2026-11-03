import type { Metadata } from "next";
import { Suspense } from "react";
import { BankList } from "@/components/money/bank-list";
import { ListSkeleton } from "@/components/ui/blocks";
import { DataOrigin } from "@/components/ui/data-origin";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getBankAccounts, getFirms } from "@/lib/data";

export const metadata: Metadata = { title: "Banks" };

export default function BanksPage() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Banks"
        subtitle="Business bank accounts. Payments and receipts by UPI, NEFT and cheque land here automatically."
        actions={
          <>
            <DataOrigin of="banks" />
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
  const [accounts, firms] = await Promise.all([getBankAccounts("business"), getFirms()]);
  return <BankList accounts={accounts} firmNames={Object.fromEntries(firms.map((f) => [f.id, f.name]))} />;
}

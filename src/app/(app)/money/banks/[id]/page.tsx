import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BankAccountView } from "@/components/money/bank-account-view";
import { BackLink, ListSkeleton } from "@/components/ui/blocks";
import { getBankAccounts, getBankEntries } from "@/lib/data";

export const metadata: Metadata = { title: "Bank account" };

export default function BankAccountPage({ params }: PageProps<"/money/banks/[id]">) {
  return (
    <div className="animate-fade-up">
      <BackLink href="/money/banks">Banks</BackLink>
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <Account params={params} />
      </Suspense>
    </div>
  );
}

async function Account({ params }: { params: PageProps<"/money/banks/[id]">["params"] }) {
  const { id } = await params;
  const account = (await getBankAccounts("business")).find((a) => a.id === id);
  // Banks added on this device (ids starting "local-") are looked up in the browser.
  if (!account && !id.startsWith("local-")) notFound();
  // The view works out the running balance again once this device's entries are merged in.
  const entries = account ? await getBankEntries(id) : [];
  return <BankAccountView accountId={id} account={account} entries={entries} />;
}

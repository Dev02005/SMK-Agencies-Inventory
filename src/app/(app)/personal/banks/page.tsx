import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import { Suspense } from "react";
import { BankEntriesTable } from "@/components/money/bank-views";
import { ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getBankAccounts, getBankEntries } from "@/lib/data";
import { formatINR } from "@/lib/format";
import { isPersonalUnlocked } from "@/lib/personal-lock";
import { PersonalSection } from "../personal-section";

export const metadata: Metadata = { title: "Personal banks" };

export default function PersonalBanksPage() {
  return (
    <PersonalSection>
      <PersonalBanksContent />
    </PersonalSection>
  );
}

function PersonalBanksContent() {
  return (
    <>
      <PageHeader title="Personal banks" subtitle="Kept separate from the business accounts" actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton rows={5} />}>
        <Accounts />
      </Suspense>
    </>
  );
}

async function Accounts() {
  // Checked here, next to the data: the layout alone cannot stop a page from rendering.
  if (!(await isPersonalUnlocked())) return null;
  const accounts = await getBankAccounts("personal");
  const entries = await Promise.all(accounts.map((a) => getBankEntries(a.id)));
  return (
    <div className="space-y-6">
      {accounts.map((a, i) => (
        <section key={a.id} className="space-y-3">
          <SectionCard>
            <div className="flex items-center gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-purple/10 text-purple">
                <Landmark size={21} strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-semibold tracking-[-0.3px] text-ink">{a.name}</p>
                <p className="text-[13px] text-ink-secondary">
                  {a.bank} · {a.accountNo}
                </p>
              </div>
              <p className="text-[28px] font-semibold tabular-nums tracking-[-0.4px] text-ink">{formatINR(a.balance)}</p>
            </div>
          </SectionCard>
          <BankEntriesTable entries={entries[i]} />
        </section>
      ))}
    </div>
  );
}

import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { SimpleForm } from "@/components/forms/simple-form";
import { BackLink, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getBankAccounts, getCashSummary } from "@/lib/data";
import { formatINR, todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Hand over cash" };

export default function HandoverPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[640px]">
      <PageHeader
        back={<BackLink href="/money/cash">Staff cash</BackLink>}
        title="Hand over cash"
        subtitle="Moves cash from one person to another, or into the bank"
        actions={<SampleChip />}
      />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <HandoverForm />
      </Suspense>
    </div>
  );
}

async function HandoverForm() {
  await connection();
  const [holders, banks] = await Promise.all([getCashSummary(), getBankAccounts()]);
  const people = holders.map((h) => ({ value: h.holder, label: `${h.name} · has ${formatINR(h.closing)}` }));
  return (
    <SectionCard>
      <SimpleForm
        thing="cash handover"
        submitLabel="Save handover"
        fields={[
          { name: "from", label: "From", type: "select", options: people },
          {
            name: "to",
            label: "To",
            type: "select",
            options: [...holders.map((h) => ({ value: h.holder, label: h.name })), ...banks.map((b) => ({ value: `bank:${b.id}`, label: `Deposit to ${b.name}` }))],
            defaultValue: "office",
          },
          { name: "amount", label: "Amount", type: "number", prefix: "₹", required: true },
          { name: "date", label: "Date", type: "date", defaultValue: todayISO() },
          { name: "note", label: "Note", type: "textarea", wide: true, placeholder: "e.g. Collections from Tekkali route" },
        ]}
      />
    </SectionCard>
  );
}

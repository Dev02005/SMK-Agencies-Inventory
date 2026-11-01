import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { SimpleForm } from "@/components/forms/simple-form";
import { BackLink, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getParties, getProducts } from "@/lib/data";
import { todayISO } from "@/lib/format";
import { paymentModeLabels } from "@/lib/labels";
import { partyOptions } from "@/lib/party-options";

export const metadata: Metadata = { title: "New advance" };

export default function NewAdvancePage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[640px]">
      <PageHeader
        back={<BackLink href="/money/advances">Advances</BackLink>}
        title="New advance"
        subtitle="For a fixed-price commitment, fill in the bags and rate; for a plain advance leave them empty"
        actions={<SampleChip />}
      />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <AdvanceForm />
      </Suspense>
    </div>
  );
}

async function AdvanceForm() {
  await connection();
  const [parties, products] = await Promise.all([getParties(), getProducts()]);
  return (
    <SectionCard>
      <SimpleForm
        thing="advance"
        submitLabel="Save advance"
        fields={[
          {
            name: "party",
            label: "Party",
            type: "select",
            wide: true,
            options: partyOptions(parties.filter((p) => p.kind !== "cash")),
          },
          {
            name: "kind",
            label: "Type",
            type: "select",
            options: [
              { value: "fixed_price", label: "Fixed-price cement commitment" },
              { value: "advance", label: "Plain advance" },
            ],
          },
          { name: "amount", label: "Amount received", type: "number", prefix: "₹", required: true },
          {
            name: "product",
            label: "Cement brand",
            type: "select",
            options: products.filter((p) => p.category === "cement").map((p) => ({ value: p.id, label: p.name })),
          },
          { name: "rate", label: "Fixed rate per bag", type: "number", prefix: "₹" },
          { name: "bags", label: "Bags committed", type: "number", hint: "Amount ÷ rate, e.g. ₹3,45,000 ÷ ₹345 = 1,000 bags" },
          { name: "mode", label: "Paid by", type: "select", options: Object.entries(paymentModeLabels).map(([value, label]) => ({ value, label })) },
          { name: "date", label: "Date", type: "date", defaultValue: todayISO() },
          { name: "terms", label: "Terms", type: "textarea", wide: true, placeholder: "e.g. Rate fixed till 31 Dec; lifted in lots of 100 bags" },
        ]}
      />
    </SectionCard>
  );
}

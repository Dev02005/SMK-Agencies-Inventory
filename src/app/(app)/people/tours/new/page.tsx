import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { SimpleForm } from "@/components/forms/simple-form";
import { BackLink, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getEmployees, getParties } from "@/lib/data";
import { todayISO } from "@/lib/format";
import { partyOptions } from "@/lib/party-options";

export const metadata: Metadata = { title: "Plan a visit" };

export default function NewVisitPage() {
  return (
    <div className="mx-auto max-w-[640px]">
      <PageHeader back={<BackLink href="/people/tours">Tour programs</BackLink>} title="Plan a visit" actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton rows={5} />}>
        <VisitForm />
      </Suspense>
    </div>
  );
}

async function VisitForm() {
  await connection();
  const [staff, parties] = await Promise.all([getEmployees(), getParties()]);
  return (
    <SectionCard>
      <SimpleForm
        thing="visit"
        submitLabel="Add to tour plan"
        fields={[
          { name: "staff", label: "Staff member", type: "select", options: staff.filter((s) => s.role === "field").map((s) => ({ value: s.id, label: s.fullName })) },
          { name: "date", label: "Date", type: "date", defaultValue: todayISO() },
          {
            name: "party",
            label: "Party",
            type: "select",
            wide: true,
            options: [
              { value: "", label: "New party (type the name below)" },
              ...partyOptions(parties.filter((p) => p.kind !== "cash")),
            ],
          },
          { name: "prospect", label: "New party name", placeholder: "Only for a new party" },
          {
            name: "purpose",
            label: "Purpose",
            type: "select",
            options: [
              { value: "collection", label: "Collection" },
              { value: "order", label: "Take an order" },
              { value: "new_party", label: "Meet a new party" },
              { value: "complaint", label: "Complaint" },
            ],
          },
          { name: "notes", label: "Notes", type: "textarea", wide: true },
        ]}
      />
    </SectionCard>
  );
}

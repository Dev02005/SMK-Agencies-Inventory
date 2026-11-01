import type { Metadata } from "next";
import { SimpleForm } from "@/components/forms/simple-form";
import { BackLink, SampleChip, SectionCard } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getFirms } from "@/lib/data";
import { AddFirm } from "./add-firm";

export const metadata: Metadata = { title: "Firm details" };

/** Each firm the owner bills under, with its own name, GSTIN and address; New sale asks which one a bill is from. */
export default async function FirmSettingsPage() {
  const firms = await getFirms();
  return (
    <div className="animate-fade-up mx-auto max-w-[760px]">
      <PageHeader
        back={<BackLink href="/settings">Settings</BackLink>}
        title="Firm details"
        subtitle="Printed on every bill, quotation and statement. Each bill is made under one of these firms."
        actions={<SampleChip />}
      />
      <div className="space-y-4">
        {firms.map((firm, i) => (
          <SectionCard
            key={firm.id}
            title={
              <span className="flex items-center gap-2.5">
                <span className="grid size-7 place-items-center rounded-full bg-accent text-[13px] font-semibold text-white">{i + 1}</span>
                Firm {i + 1}
                {i === 0 && <span className="text-[13px] font-normal text-ink-secondary">· main firm</span>}
              </span>
            }
          >
            <SimpleForm
              thing="firm details"
              submitLabel="Save details"
              fields={[
                { name: "name", label: "Firm name", required: true, defaultValue: firm.name, wide: true },
                { name: "gstin", label: "GSTIN", defaultValue: firm.gstin },
                { name: "phone", label: "Phone", prefix: "+91", defaultValue: firm.phone },
                { name: "address", label: "Address", required: true, defaultValue: firm.address, wide: true },
              ]}
            />
          </SectionCard>
        ))}
        <AddFirm next={firms.length + 1} />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { SimpleForm } from "@/components/forms/simple-form";
import { BackLink, SampleChip, SectionCard } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getFirm } from "@/lib/data";

export const metadata: Metadata = { title: "Firm details" };

export default async function FirmSettingsPage() {
  const firm = await getFirm();
  return (
    <div className="animate-fade-up mx-auto max-w-[760px]">
      <PageHeader back={<BackLink href="/settings">Settings</BackLink>} title="Firm details" subtitle="Printed on every bill, quotation and statement" actions={<SampleChip />} />
      <SectionCard>
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
      <p className="mt-3 px-1 text-[13px] text-ink-secondary">
        Buying from several firms is planned: each firm gets its own GSTIN and bill numbers once the owner confirms the list.
      </p>
    </div>
  );
}

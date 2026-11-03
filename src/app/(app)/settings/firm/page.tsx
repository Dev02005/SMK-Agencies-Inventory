import type { Metadata } from "next";
import { BackLink, SectionCard } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getFirms } from "@/lib/data";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { removeFirm } from "./actions";
import { AddFirm } from "./add-firm";
import { FirmForm } from "./firm-form";

export const metadata: Metadata = { title: "Firm details" };

/**
 * Each firm with its own name, GSTIN and address. The primary firm is the one sales are billed from; purchases ask
 * which firm they are for. Saved on the computer running the app (local-data/firms.json) until Supabase is connected.
 */
export default async function FirmSettingsPage() {
  const firms = await getFirms();
  return (
    <div className="animate-fade-up mx-auto max-w-[760px]">
      <PageHeader
        back={<BackLink href="/settings">Settings</BackLink>}
        title="Firm details"
        subtitle="Printed on bills, quotations and statements. Sales are billed from the primary firm; purchases can be in any firm."
      />
      <div className="space-y-4">
        {firms.map((firm, i) => (
          <SectionCard
            key={firm.id}
            title={
              <span className="flex items-center gap-2.5">
                <span className="grid size-7 place-items-center rounded-full bg-accent text-[13px] font-semibold text-white">{i + 1}</span>
                Firm {i + 1}
              </span>
            }
          >
            {/* Keyed by the saved values, so the form starts afresh after a save (e.g. when the primary firm changes). */}
            <FirmForm key={[firm.name, firm.gstin, firm.phone, firm.address, firm.primary].join("|")} firm={firm} />
            {!firm.primary && firms.length > 1 && <ConfirmDelete what={firm.name} onDelete={removeFirm.bind(null, firm.id)} className="mt-4" />}
          </SectionCard>
        ))}
        <AddFirm next={firms.length + 1} />
      </div>
    </div>
  );
}

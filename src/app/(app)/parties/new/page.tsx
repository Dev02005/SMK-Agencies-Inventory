import type { Metadata } from "next";
import { BackLink, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getProfiles } from "@/lib/data";
import { PartyForm } from "./party-form";

export const metadata: Metadata = { title: "New party" };

export default async function NewPartyPage() {
  const staff = (await getProfiles()).filter((p) => p.role === "field" && p.active);
  return (
    <div className="animate-fade-up mx-auto max-w-[640px]">
      <PageHeader back={<BackLink href="/parties">Parties</BackLink>} title="New party" actions={<SampleChip />} />
      <PartyForm staff={staff.map((s) => ({ id: s.id, name: s.fullName }))} />
    </div>
  );
}

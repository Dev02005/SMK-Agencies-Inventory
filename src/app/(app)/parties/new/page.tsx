import type { Metadata } from "next";
import { Suspense } from "react";
import { BackLink, ListSkeleton } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getProfiles } from "@/lib/data";
import { PartyForm } from "./party-form";

export const metadata: Metadata = { title: "New party" };

export default function NewPartyPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[640px]">
      <PageHeader back={<BackLink href="/parties">Parties</BackLink>} title="New party" subtitle="Saved straight away; you can delete it from its page" />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <NewPartyForm />
      </Suspense>
    </div>
  );
}

// The staff list is read at request time, so the form streams in.
async function NewPartyForm() {
  const staff = (await getProfiles()).filter((p) => p.role === "field" && p.active);
  return <PartyForm staff={staff.map((s) => ({ id: s.id, name: s.fullName }))} />;
}

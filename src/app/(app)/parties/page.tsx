import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getParties, getProfiles } from "@/lib/data";
import { PartiesList } from "./parties-list";

export const metadata: Metadata = { title: "Parties" };

export default function PartiesPage() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Parties"
        subtitle="Customers, sub-dealers, supplier companies and lorry owners"
        actions={
          <>
            <SampleChip />
            <ButtonLink href="/parties/new">New party</ButtonLink>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <PartiesData />
      </Suspense>
    </div>
  );
}

async function PartiesData() {
  const [parties, profiles] = await Promise.all([getParties(), getProfiles()]);
  const staff = Object.fromEntries(profiles.map((p) => [p.id, p.fullName]));
  return <PartiesList parties={parties} staff={staff} />;
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { RoleGuard } from "@/components/ui/sub-nav";
import { getEmployees, getParties } from "@/lib/data";
import { MappingBoard } from "./mapping-board";
import { OwnerPage } from "@/components/auth/owner-only";

export const metadata: Metadata = { title: "Sub-dealer mapping" };

function MappingPageContent() {
  return (
    <>
      <PageHeader
        title="Sub-dealer mapping"
        subtitle="Which staff member looks after each customer and sub-dealer. They see only their own parties."
        actions={<SampleChip />}
      />
      <RoleGuard roles={["owner", "office"]}>
        <Suspense fallback={<ListSkeleton />}>
          <MappingData />
        </Suspense>
      </RoleGuard>
    </>
  );
}

async function MappingData() {
  const [parties, staff] = await Promise.all([getParties(), getEmployees()]);
  return (
    <MappingBoard
      parties={parties
        .filter((p) => p.kind === "customer" || p.kind === "sub_dealer")
        .map((p) => ({ id: p.id, name: p.name, place: p.place, kind: p.kind, assignedTo: p.assignedTo ?? "", balance: p.balance }))}
      staff={staff.filter((s) => s.role === "field").map((s) => ({ id: s.id, name: s.fullName, areas: s.areas }))}
    />
  );
}

export default function MappingPage() {
  return (
    <OwnerPage what="people records">
      <MappingPageContent />
    </OwnerPage>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getEmployees, getToday, getVisits } from "@/lib/data";
import { ToursBoard } from "./tours-board";

export const metadata: Metadata = { title: "Tour programs" };

export default function ToursPage() {
  return (
    <>
      <PageHeader
        title="Tour programs"
        subtitle="Planned visits to parties and how each one went"
        actions={
          <>
            <SampleChip />
            <ButtonLink href="/people/tours/new">Plan a visit</ButtonLink>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <ToursData />
      </Suspense>
    </>
  );
}

async function ToursData() {
  const [visits, staff] = await Promise.all([getVisits(), getEmployees()]);
  return <ToursBoard visits={visits} staff={staff.filter((s) => s.role === "field").map((s) => ({ id: s.id, name: s.fullName }))} today={getToday()} />;
}

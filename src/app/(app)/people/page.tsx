import { ChevronRight, Phone } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListSkeleton, SampleTag, StatCard, StatRow } from "@/components/ui/blocks";
import { DataOrigin } from "@/components/ui/data-origin";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { RoleGuard } from "@/components/ui/sub-nav";
import { getDesignations, getEmployees, getProfiles } from "@/lib/data";
import { roleLabels } from "@/lib/labels";
import { OwnerPage } from "@/components/auth/owner-only";

export const metadata: Metadata = { title: "People" };

function PeoplePageContent() {
  return (
    <>
      <PageHeader
        title="People"
        subtitle="Admins, staff and drivers, and their areas"
        actions={
          <>
            <DataOrigin of="staff" />
            <RoleGuard roles={["owner", "office"]} fallback={null}>
              <ButtonLink href="/people/new">New employee</ButtonLink>
            </RoleGuard>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <Staff />
      </Suspense>
    </>
  );
}

async function Staff() {
  const [staff, profiles, designations] = await Promise.all([getEmployees(), getProfiles(), getDesignations()]);
  // The owner first, then the other admins (staff.json's "admins"): everyone who sees the whole business.
  const admins = profiles.filter((p) => p.role === "owner" && p.active);
  // Staff by category (their designation: Retail manager, Driver…), in the order the roles run through the business.
  const roleOrder = ["office", "field", "godown", "driver"];
  const categories = [...new Set(staff.map((e) => e.designation))]
    .map((designation) => ({ designation, people: staff.filter((e) => e.designation === designation) }))
    .sort((a, b) => roleOrder.indexOf(a.people[0].role) - roleOrder.indexOf(b.people[0].role) || a.designation.localeCompare(b.designation));

  return (
    <div className="space-y-4">
      <StatRow>
        <StatCard label="Admins" value={admins.length} />
        <StatCard label="Staff" value={staff.length} />
        <StatCard label="Parties with staff" value={staff.reduce((s, e) => s + e.partiesCount, 0)} hint="assigned to sales staff" />
      </StatRow>
      {admins.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="flex items-baseline gap-2 text-[20px] font-semibold tracking-[-0.3px] text-ink">
            Owner &amp; admins
            <span className="text-[15px] font-normal text-ink-secondary">{admins.length}</span>
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {admins.map((a) => (
              <li key={a.id} className="surface flex items-center gap-4 p-5">
                <Avatar person={a} className="size-12 bg-accent-soft text-[15px] text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[17px] font-semibold tracking-[-0.3px] text-ink">{a.fullName}</span>
                    <Chip tone="accent">{a.id === admins[0].id ? "Owner" : "Admin"}</Chip>
                    <SampleTag record={a} />
                  </span>
                  <span className="mt-0.5 block text-[13px] text-ink-secondary">{designations[a.id] ?? "Admin"}</span>
                  {a.mobile && <span className="mt-1 block text-[13px] tabular-nums text-ink-secondary">+91 {a.mobile}</span>}
                </span>
                {a.mobile && (
                  <a
                    href={`tel:+91${a.mobile}`}
                    aria-label={`Call ${a.fullName}`}
                    title="Call"
                    className="grid size-10 shrink-0 place-items-center rounded-full text-accent hover:bg-accent-soft"
                  >
                    <Phone size={18} strokeWidth={1.9} aria-hidden />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {categories.map((c) => (
        <section key={c.designation} className="space-y-3 pt-2">
          <h2 className="flex items-baseline gap-2 text-[20px] font-semibold tracking-[-0.3px] text-ink">
            {c.designation}
            <span className="text-[15px] font-normal text-ink-secondary">{c.people.length}</span>
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {c.people.map((e) => (
              <li key={e.id}>
                <Link href={`/people/${e.id}`} className="surface flex items-start gap-4 p-5 transition hover:shadow-raised">
                  <Avatar person={e} className="size-12 bg-accent-soft text-[15px] text-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[17px] font-semibold tracking-[-0.3px] text-ink">{e.fullName}</span>
                      <Chip>{roleLabels[e.role]}</Chip>
                      <SampleTag record={e} />
                    </span>
                    <span className="mt-0.5 block text-[13px] text-ink-secondary">{e.designation}</span>
                    <span className="mt-2 block text-[13px] text-ink-secondary">
                      {e.areas.join(", ")}
                      {e.partiesCount > 0 && ` · ${e.partiesCount} parties`}
                    </span>
                  </span>
                  <ChevronRight size={18} strokeWidth={1.75} className="mt-1 text-ink-tertiary" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function PeoplePage() {
  return (
    <OwnerPage what="people records">
      <PeoplePageContent />
    </OwnerPage>
  );
}

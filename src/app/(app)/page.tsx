import { Suspense } from "react";
import { DriverHome } from "@/components/home/driver-home";
import { FieldHome } from "@/components/home/field-home";
import { GodownHome } from "@/components/home/godown-home";
import { OwnerHome } from "@/components/home/owner-home";
import { RoleHome } from "@/components/home/role-home";
import { ListSkeleton } from "@/components/ui/blocks";
import { getProfiles } from "@/lib/data";

/** Each role has its own home screen; "View as" in the profile menu switches between them in sample mode. */
export default function HomePage() {
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      <Homes />
    </Suspense>
  );
}

// The staff list is read at request time (it can change on another server), so the screens stream in.
async function Homes() {
  const profiles = await getProfiles();
  // "View as" shows the first person of each role, matching the initials in the top bar.
  const first = (role: string) => profiles.find((p) => p.role === role)!.id;
  const owner = <OwnerHome />;
  return (
    <RoleHome
      screens={{
        owner,
        office: owner,
        field: <FieldHome profileId={first("field")} />,
        godown: <GodownHome />,
        driver: <DriverHome profileId={first("driver")} />,
      }}
    />
  );
}

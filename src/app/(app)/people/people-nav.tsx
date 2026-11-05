import { SubNav } from "@/components/ui/sub-nav";

export function PeopleNav() {
  return (
    <SubNav
      label="People"
      items={[
        { href: "/people", label: "Staff" },
        { href: "/people/tours", label: "Tours" },
        { href: "/people/targets", label: "Targets", roles: ["owner", "office", "field"] },
        { href: "/people/mapping", label: "Sub-dealer mapping", roles: ["owner", "office"] },
        { href: "/people/salary", label: "Salary & loans", roles: ["owner", "office"] },
      ]}
    />
  );
}

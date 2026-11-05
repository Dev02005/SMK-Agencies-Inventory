import type { ReactNode } from "react";
import { SubNav } from "@/components/ui/sub-nav";

export default function FleetLayout({ children }: { children: ReactNode }) {
  return (
    <div className="animate-fade-up">
      <SubNav
        label="Vehicles"
        items={[
          { href: "/fleet", label: "Vehicles" },
          { href: "/fleet/trips", label: "Trips" },
          { href: "/fleet/map", label: "Map" },
          { href: "/fleet/drivers", label: "Drivers", roles: ["owner", "office"] },
        ]}
      />
      {children}
    </div>
  );
}

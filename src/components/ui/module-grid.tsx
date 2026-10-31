"use client";

import { useViewAs } from "@/lib/roles";
import { visibleSections } from "@/lib/sections";
import { ModuleCard } from "./module-card";

/** Every module the current role can open, as OrbWeather-style cards. */
export function ModuleGrid() {
  const [role] = useViewAs();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {visibleSections(role).map((section) => (
        <ModuleCard key={section.href} section={section} />
      ))}
    </div>
  );
}

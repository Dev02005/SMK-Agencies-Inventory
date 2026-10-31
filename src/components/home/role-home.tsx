"use client";

import type { ReactNode } from "react";
import type { Role } from "@/lib/data/types";
import { useViewAs } from "@/lib/roles";

/**
 * Picks the home screen for the current role. In sample mode the role comes from "View as" in this browser;
 * once login exists the server knows the role and renders only that screen.
 */
export function RoleHome({ screens }: { screens: Record<Role, ReactNode> }) {
  const [role] = useViewAs();
  return <>{screens[role]}</>;
}

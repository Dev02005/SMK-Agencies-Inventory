"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Role } from "@/lib/data/types";
import { allRoles } from "@/lib/labels";

export { allRoles, roleLabels } from "@/lib/labels";

/**
 * "View as" for the sample stage: lets the team preview what each role sees.
 * Kept in this browser only; once login exists the role comes from the user's profile instead.
 */
const KEY = "ska-view-as";
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function readRole(): Role {
  try {
    const value = window.localStorage.getItem(KEY);
    return allRoles.includes(value as Role) ? (value as Role) : "owner";
  } catch {
    return "owner";
  }
}

export function useViewAs(): [Role, (role: Role) => void] {
  const role = useSyncExternalStore(subscribe, readRole, () => "owner" as Role);
  const setRole = useCallback((next: Role) => {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Storage blocked (private mode): the switch simply won't persist.
    }
    listeners.forEach((listener) => listener());
  }, []);
  return [role, setRole];
}
